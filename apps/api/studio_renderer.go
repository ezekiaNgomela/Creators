package main

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type StudioRenderer struct {
	UploadDir string
	jobs      sync.Map
}

type studioRenderJobState struct {
	ID                string
	Status            string
	Message           string
	OutputURL         string
	OutputFormat      string
	RendererAvailable bool
	CreatedAt         time.Time
	StartedAt         *time.Time
	FinishedAt        *time.Time
	Input             StudioRenderInput
}

func NewStudioRenderer(uploadDir string) *StudioRenderer {
	if uploadDir == "" {
		uploadDir = "uploads"
	}
	return &StudioRenderer{UploadDir: uploadDir}
}

func (r *StudioRenderer) Health(ctx context.Context) StudioRendererHealth {
	binary, err := exec.LookPath("ffmpeg")
	if err != nil {
		return StudioRendererHealth{
			Available:        false,
			Message:          "FFmpeg is not installed locally. Install FFmpeg to enable final video/audio rendering.",
			SupportedInputs:  supportedStudioInputs(),
			SupportedOutputs: supportedStudioOutputs(),
		}
	}

	version := "ffmpeg detected"
	versionCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	output, err := exec.CommandContext(versionCtx, binary, "-version").Output()
	if err == nil {
		version = firstLine(string(output))
	}
	return StudioRendererHealth{
		Available:        true,
		Binary:           binary,
		Version:          version,
		Message:          "Studio renderer is ready.",
		SupportedInputs:  supportedStudioInputs(),
		SupportedOutputs: supportedStudioOutputs(),
	}
}

func (r *StudioRenderer) Start(ctx context.Context, input StudioRenderInput) (StudioRenderJob, error) {
	if err := validateStudioRenderInput(input); err != nil {
		return StudioRenderJob{}, err
	}

	jobID := randomFileName("")
	job := &studioRenderJobState{
		ID:           jobID,
		Status:       "queued",
		Message:      "Render queued.",
		OutputFormat: normalizeOutputFormat(input.OutputFormat),
		CreatedAt:    time.Now().UTC(),
		Input:        input,
	}
	r.jobs.Store(jobID, job)

	go r.render(context.Background(), job)

	return r.publicJob(job), nil
}

func (r *StudioRenderer) Find(jobID string) (StudioRenderJob, bool) {
	value, ok := r.jobs.Load(jobID)
	if !ok {
		return StudioRenderJob{}, false
	}
	job, ok := value.(*studioRenderJobState)
	if !ok {
		return StudioRenderJob{}, false
	}
	return r.publicJob(job), true
}

func (r *StudioRenderer) render(ctx context.Context, job *studioRenderJobState) {
	started := time.Now().UTC()
	job.StartedAt = &started
	job.Status = "running"
	job.Message = "Rendering timeline with FFmpeg."

	health := r.Health(ctx)
	job.RendererAvailable = health.Available
	if !health.Available {
		r.finish(job, "failed", health.Message, "")
		return
	}

	outputPath, outputURL, err := r.outputPath(job.ID, job.OutputFormat)
	if err != nil {
		r.finish(job, "failed", err.Error(), "")
		return
	}
	args, err := r.ffmpegArgs(job.Input, outputPath)
	if err != nil {
		r.finish(job, "failed", err.Error(), "")
		return
	}

	renderCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	command := exec.CommandContext(renderCtx, health.Binary, args...)
	output, err := command.CombinedOutput()
	if err != nil {
		message := strings.TrimSpace(string(output))
		if message == "" {
			message = err.Error()
		}
		r.finish(job, "failed", "FFmpeg render failed: "+message, "")
		return
	}
	r.finish(job, "completed", "Render complete.", outputURL)
}

func (r *StudioRenderer) ffmpegArgs(input StudioRenderInput, outputPath string) ([]string, error) {
	outputFormat := normalizeOutputFormat(input.OutputFormat)
	if isAudioOutput(outputFormat) {
		return r.audioTimelineArgs(input, outputFormat, outputPath)
	}

	visualClips := orderedClips(input.Clips, "video", "image")
	audioClips := orderedClips(input.Clips, "audio")
	if len(visualClips) == 0 {
		return nil, errors.New("video export requires at least one visual clip")
	}

	args := []string{"-y"}
	type inputClipRef struct {
		clip  StudioRenderClip
		index int
	}

	videoRefs := []inputClipRef{}
	audioRefs := []inputClipRef{}
	inputIndex := 0
	for _, clip := range visualClips {
		duration := clipDuration(clip)
		if clipNeedsLoop(clip) {
			args = append(args, "-loop", "1", "-t", ffmpegFloat(duration), "-i", r.resolveSource(clip.URL))
		} else {
			args = append(args, "-ss", ffmpegFloat(clip.InPoint), "-t", ffmpegFloat(duration), "-i", r.resolveSource(clip.URL))
		}
		videoRefs = append(videoRefs, inputClipRef{clip: clip, index: inputIndex})
		inputIndex++
	}

	if !isImageOutput(outputFormat) {
		for _, clip := range audioClips {
			duration := clipDuration(clip)
			args = append(args, "-ss", ffmpegFloat(clip.InPoint), "-t", ffmpegFloat(duration), "-i", r.resolveSource(clip.URL))
			audioRefs = append(audioRefs, inputClipRef{clip: clip, index: inputIndex})
			inputIndex++
		}
	}

	projectEnd := projectTimelineEnd(append(visualClips, audioClips...))
	if isImageOutput(outputFormat) {
		projectEnd = projectTimelineEnd(visualClips)
	}
	if projectEnd <= 0 {
		projectEnd = 1
	}

	targetWidth, targetHeight := studioOutputSize(input.AspectRatio)
	filters := []string{}
	videoLabels := []string{}
	cursor := 0.0
	for index, ref := range videoRefs {
		if ref.clip.Start > cursor+0.05 {
			label := fmt.Sprintf("vgap%d", index)
			filters = append(filters, fmt.Sprintf("color=c=black:s=%dx%d:r=30:d=%s[%s]", targetWidth, targetHeight, ffmpegFloat(ref.clip.Start-cursor), label))
			videoLabels = append(videoLabels, "["+label+"]")
			cursor = ref.clip.Start
		}

		label := fmt.Sprintf("v%d", index)
		filters = append(filters, fmt.Sprintf("[%d:v:0]%s,setsar=1,trim=duration=%s,setpts=PTS-STARTPTS[%s]", ref.index, studioVideoFilter(input, outputFormat), ffmpegFloat(clipDuration(ref.clip)), label))
		videoLabels = append(videoLabels, "["+label+"]")
		cursor = ref.clip.Start + clipDuration(ref.clip)
	}
	if cursor < projectEnd-0.05 {
		label := "vgapend"
		filters = append(filters, fmt.Sprintf("color=c=black:s=%dx%d:r=30:d=%s[%s]", targetWidth, targetHeight, ffmpegFloat(projectEnd-cursor), label))
		videoLabels = append(videoLabels, "["+label+"]")
	}
	if len(videoLabels) == 1 {
		filters = append(filters, videoLabels[0]+"format=yuv420p[vout]")
	} else {
		filters = append(filters, strings.Join(videoLabels, "")+fmt.Sprintf("concat=n=%d:v=1:a=0,format=yuv420p[vout]", len(videoLabels)))
	}

	audioLabels := []string{}
	for index, ref := range audioRefs {
		label := fmt.Sprintf("a%d", index)
		chain := fmt.Sprintf("[%d:a:0]atrim=duration=%s,asetpts=PTS-STARTPTS", ref.index, ffmpegFloat(clipDuration(ref.clip)))
		if audioFilter := studioAudioFilter(ref.clip); audioFilter != "" {
			chain += "," + audioFilter
		}
		if ref.clip.Start > 0 {
			chain += fmt.Sprintf(",adelay=%d:all=1", int(math.Round(ref.clip.Start*1000)))
		}
		filters = append(filters, chain+"["+label+"]")
		audioLabels = append(audioLabels, "["+label+"]")
	}
	if len(audioLabels) == 1 {
		filters = append(filters, audioLabels[0]+"atrim=duration="+ffmpegFloat(projectEnd)+"[aout]")
	} else if len(audioLabels) > 1 {
		filters = append(filters, strings.Join(audioLabels, "")+fmt.Sprintf("amix=inputs=%d:duration=longest:normalize=0,atrim=duration=%s[aout]", len(audioLabels), ffmpegFloat(projectEnd)))
	}

	args = append(args, "-filter_complex", strings.Join(filters, ";"), "-map", "[vout]")
	if outputFormat == "gif" {
		args = append(args, "-an", "-loop", "0", outputPath)
		return args, nil
	}

	hasAudio := len(audioLabels) > 0
	if hasAudio {
		args = append(args, "-map", "[aout]")
	} else {
		args = append(args, "-an")
	}
	if outputFormat == "webm" {
		args = append(args, "-c:v", "libvpx-vp9", "-b:v", "2M", "-pix_fmt", "yuv420p")
		if hasAudio {
			args = append(args, "-c:a", "libopus", "-b:a", "128k")
		}
	} else {
		args = append(args, "-c:v", "libx264", "-pix_fmt", "yuv420p")
		if hasAudio {
			args = append(args, "-c:a", "aac", "-b:a", "192k")
		}
	}
	args = append(args, "-t", ffmpegFloat(projectEnd))
	args = append(args, outputPath)
	return args, nil
}

func (r *StudioRenderer) audioTimelineArgs(input StudioRenderInput, outputFormat string, outputPath string) ([]string, error) {
	audioClips := orderedClips(input.Clips, "audio")
	if len(audioClips) == 0 {
		return nil, errors.New("audio export requires at least one audio clip")
	}
	projectEnd := projectTimelineEnd(audioClips)
	if projectEnd <= 0 {
		projectEnd = clipDuration(audioClips[0])
	}
	if len(audioClips) == 1 && audioClips[0].Start == 0 {
		return r.audioArgs(audioClips[0], outputFormat, outputPath)
	}

	args := []string{"-y"}
	for _, clip := range audioClips {
		args = append(args, "-ss", ffmpegFloat(clip.InPoint), "-t", ffmpegFloat(clipDuration(clip)), "-i", r.resolveSource(clip.URL))
	}

	filters := []string{}
	audioLabels := []string{}
	for index, clip := range audioClips {
		label := fmt.Sprintf("a%d", index)
		chain := fmt.Sprintf("[%d:a:0]atrim=duration=%s,asetpts=PTS-STARTPTS", index, ffmpegFloat(clipDuration(clip)))
		if audioFilter := studioAudioFilter(clip); audioFilter != "" {
			chain += "," + audioFilter
		}
		if clip.Start > 0 {
			chain += fmt.Sprintf(",adelay=%d:all=1", int(math.Round(clip.Start*1000)))
		}
		filters = append(filters, chain+"["+label+"]")
		audioLabels = append(audioLabels, "["+label+"]")
	}
	if len(audioLabels) == 1 {
		filters = append(filters, audioLabels[0]+"atrim=duration="+ffmpegFloat(projectEnd)+"[aout]")
	} else {
		filters = append(filters, strings.Join(audioLabels, "")+fmt.Sprintf("amix=inputs=%d:duration=longest:normalize=0,atrim=duration=%s[aout]", len(audioLabels), ffmpegFloat(projectEnd)))
	}

	args = append(args, "-filter_complex", strings.Join(filters, ";"), "-map", "[aout]")
	args = appendAudioCodec(args, outputFormat)
	args = append(args, outputPath)
	return args, nil
}

func (r *StudioRenderer) audioArgs(clip StudioRenderClip, outputFormat string, outputPath string) ([]string, error) {
	args := []string{"-y", "-ss", ffmpegFloat(clip.InPoint), "-t", ffmpegFloat(clipDuration(clip)), "-i", r.resolveSource(clip.URL)}
	if filter := studioAudioFilter(clip); filter != "" {
		args = append(args, "-af", filter)
	}
	args = appendAudioCodec(args, outputFormat)
	args = append(args, outputPath)
	return args, nil
}

func appendAudioCodec(args []string, outputFormat string) []string {
	switch outputFormat {
	case "wav":
		args = append(args, "-c:a", "pcm_s16le")
	case "flac":
		args = append(args, "-c:a", "flac")
	case "aac":
		args = append(args, "-c:a", "aac", "-b:a", "192k")
	default:
		args = append(args, "-c:a", "libmp3lame", "-b:a", "192k")
	}
	return args
}

func (r *StudioRenderer) outputPath(jobID string, outputFormat string) (string, string, error) {
	renderDir := filepath.Join(r.UploadDir, "renders")
	if err := os.MkdirAll(renderDir, 0o755); err != nil {
		return "", "", fmt.Errorf("could not prepare render storage: %w", err)
	}
	extension := "." + normalizeOutputFormat(outputFormat)
	fileName := jobID + extension
	return filepath.Join(renderDir, fileName), "/uploads/renders/" + fileName, nil
}

func (r *StudioRenderer) resolveSource(rawURL string) string {
	if rawURL == "" {
		return rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	pathValue := parsed.Path
	if pathValue == "" || (!strings.HasPrefix(pathValue, "/uploads/") && !strings.HasPrefix(rawURL, "/uploads/")) {
		return rawURL
	}
	fileName := strings.TrimPrefix(pathValue, "/uploads/")
	fileName = filepath.FromSlash(fileName)
	localPath := filepath.Join(r.UploadDir, fileName)
	if _, err := os.Stat(localPath); err == nil {
		return localPath
	}
	return rawURL
}

func (r *StudioRenderer) finish(job *studioRenderJobState, status string, message string, outputURL string) {
	finished := time.Now().UTC()
	job.Status = status
	job.Message = message
	job.OutputURL = outputURL
	job.FinishedAt = &finished
}

func (r *StudioRenderer) publicJob(job *studioRenderJobState) StudioRenderJob {
	return StudioRenderJob{
		ID:                job.ID,
		Status:            job.Status,
		Message:           job.Message,
		OutputURL:         job.OutputURL,
		OutputFormat:      job.OutputFormat,
		RendererAvailable: job.RendererAvailable,
		CreatedAt:         job.CreatedAt.Format(time.RFC3339),
		StartedAt:         formatOptionalTime(job.StartedAt),
		FinishedAt:        formatOptionalTime(job.FinishedAt),
		Input:             job.Input,
	}
}

func validateStudioRenderInput(input StudioRenderInput) error {
	if len(input.Clips) == 0 {
		return errors.New("timeline needs at least one clip")
	}
	for _, clip := range input.Clips {
		if strings.TrimSpace(clip.ID) == "" || strings.TrimSpace(clip.Type) == "" {
			return errors.New("each timeline clip needs an id and type")
		}
		if clip.Type != "text" && clip.Type != "effect" && strings.TrimSpace(clip.URL) == "" {
			return fmt.Errorf("%s is missing a media url", clip.Title)
		}
		if strings.HasPrefix(strings.TrimSpace(clip.URL), "audio:") {
			return fmt.Errorf("%s uses demo audio; import an audio file before rendering it", clip.Title)
		}
		if clip.OutPoint <= clip.InPoint && clip.Type != "text" && clip.Type != "effect" {
			return fmt.Errorf("%s has an invalid trim range", clip.Title)
		}
	}
	return nil
}

func orderedClips(clips []StudioRenderClip, clipTypes ...string) []StudioRenderClip {
	allowed := map[string]bool{}
	for _, clipType := range clipTypes {
		allowed[clipType] = true
	}
	selected := []StudioRenderClip{}
	for _, clip := range clips {
		if !allowed[clip.Type] || strings.TrimSpace(clip.URL) == "" {
			continue
		}
		selected = append(selected, clip)
	}
	sort.SliceStable(selected, func(i int, j int) bool {
		if selected[i].Start == selected[j].Start {
			return selected[i].ID < selected[j].ID
		}
		return selected[i].Start < selected[j].Start
	})
	return selected
}

func clipDuration(clip StudioRenderClip) float64 {
	duration := clip.OutPoint - clip.InPoint
	if duration <= 0 {
		duration = clip.SourceDuration
	}
	if duration <= 0 {
		return 1
	}
	return duration
}

func studioVideoFilter(input StudioRenderInput, outputFormat string) string {
	width, height := studioOutputSize(input.AspectRatio)
	size := fmt.Sprintf("scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2", width, height, width, height)

	filters := []string{size}
	if input.Rotation != 0 {
		turns := ((input.Rotation % 360) + 360) % 360
		if turns == 90 {
			filters = append(filters, "transpose=1")
		} else if turns == 180 {
			filters = append(filters, "transpose=1,transpose=1")
		} else if turns == 270 {
			filters = append(filters, "transpose=2")
		}
	}
	switch strings.ToLower(input.FilterName) {
	case "glow":
		filters = append(filters, "eq=saturation=1.18:contrast=1.06:brightness=0.04")
	case "warm":
		filters = append(filters, "colorbalance=rs=.08:gs=.03:bs=-.04")
	case "mono":
		filters = append(filters, "hue=s=0")
	case "pop":
		filters = append(filters, "eq=saturation=1.42:contrast=1.12")
	}
	if outputFormat == "gif" {
		filters = append(filters, "fps=12")
	}
	return strings.Join(filters, ",")
}

func studioOutputSize(aspectRatio string) (int, int) {
	switch aspectRatio {
	case "9:16":
		return 720, 1280
	case "1:1":
		return 1080, 1080
	case "4:5":
		return 1080, 1350
	default:
		return 1280, 720
	}
}

func clipNeedsLoop(clip StudioRenderClip) bool {
	return clip.Type == "image" || sourceHasExtension(clip.URL, ".jpg", ".jpeg", ".png", ".gif", ".webp")
}

func sourceHasExtension(rawURL string, extensions ...string) bool {
	parsed, err := url.Parse(rawURL)
	pathValue := rawURL
	if err == nil && parsed.Path != "" {
		pathValue = parsed.Path
	}
	extension := strings.ToLower(filepath.Ext(pathValue))
	for _, allowed := range extensions {
		if extension == allowed {
			return true
		}
	}
	return false
}

func projectTimelineEnd(clips []StudioRenderClip) float64 {
	end := 0.0
	for _, clip := range clips {
		end = math.Max(end, clip.Start+clipDuration(clip))
	}
	return end
}

func studioAudioFilter(clip StudioRenderClip) string {
	filters := []string{}
	if clip.Gain > 0 && clip.Gain != 100 {
		filters = append(filters, "volume="+ffmpegFloat(clip.Gain/100))
	}
	switch clip.AudioEffect {
	case "noise-reduction":
		filters = append(filters, "afftdn")
	case "loudness":
		filters = append(filters, "loudnorm")
	case "distortion":
		filters = append(filters, "acrusher=bits=8:mix=.45")
	case "flanger":
		filters = append(filters, "flanger")
	case "de-esser":
		filters = append(filters, "deesser")
	case "bass-boost":
		filters = append(filters, "bass=g=8")
	case "echo":
		filters = append(filters, "aecho=0.8:0.88:60:0.35")
	}
	return strings.Join(filters, ",")
}

func isAudioOutput(format string) bool {
	switch normalizeOutputFormat(format) {
	case "mp3", "wav", "aac", "flac":
		return true
	default:
		return false
	}
}

func isImageOutput(format string) bool {
	return normalizeOutputFormat(format) == "gif"
}

func normalizeOutputFormat(format string) string {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "mov", "webm", "mkv", "gif", "mp3", "wav", "aac", "flac":
		return strings.ToLower(strings.TrimSpace(format))
	default:
		return "mp4"
	}
}

func supportedStudioInputs() []string {
	return []string{"mp4", "mov", "webm", "mkv", "gif", "jpg", "jpeg", "png", "webp", "mp3", "wav", "aac", "flac", "m4a", "ogg"}
}

func supportedStudioOutputs() []string {
	return []string{"mp4", "mov", "webm", "mkv", "gif", "mp3", "wav", "aac", "flac"}
}

func firstLine(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if line, _, ok := strings.Cut(value, "\n"); ok {
		return strings.TrimSpace(line)
	}
	return value
}

func ffmpegFloat(value float64) string {
	return strconv.FormatFloat(value, 'f', 3, 64)
}

func formatOptionalTime(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format(time.RFC3339)
	return &formatted
}
