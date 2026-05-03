package main

import (
	"strings"
	"testing"
)

func TestStudioRendererBuildsTimelineFFmpegArgs(t *testing.T) {
	renderer := NewStudioRenderer("uploads")
	args, err := renderer.ffmpegArgs(StudioRenderInput{
		AspectRatio:  "16:9",
		FilterName:   "pop",
		OutputFormat: "webm",
		Clips: []StudioRenderClip{
			{
				ID:             "clip-image-1",
				Type:           "image",
				Track:          "sequence",
				Title:          "A.jpg",
				URL:            "/uploads/a.jpg",
				Start:          0,
				InPoint:        0,
				OutPoint:       5,
				SourceDuration: 5,
				Format:         "jpg",
			},
			{
				ID:             "clip-image-2",
				Type:           "image",
				Track:          "sequence",
				Title:          "B.jpg",
				URL:            "/uploads/b.jpg",
				Start:          7,
				InPoint:        0,
				OutPoint:       3,
				SourceDuration: 3,
				Format:         "jpg",
			},
			{
				AudioEffect:    "distortion",
				Format:         "mp3",
				Gain:           120,
				ID:             "clip-audio-1",
				InPoint:        0,
				OutPoint:       4,
				SourceDuration: 4,
				Start:          1,
				Title:          "Voice.mp3",
				Track:          "audio",
				Type:           "audio",
				URL:            "/uploads/voice.mp3",
			},
		},
	}, "render.webm")
	if err != nil {
		t.Fatalf("ffmpegArgs returned error: %v", err)
	}

	joined := strings.Join(args, " ")
	for _, expected := range []string{
		"-filter_complex",
		"concat=n=3:v=1:a=0",
		"adelay=1000:all=1",
		"acrusher=bits=8:mix=.45",
		"-c:v libvpx-vp9",
		"-c:a libopus",
		"render.webm",
	} {
		if !strings.Contains(joined, expected) {
			t.Fatalf("expected args to contain %q, got %s", expected, joined)
		}
	}
}

func TestStudioRenderValidationRejectsDemoAudio(t *testing.T) {
	err := validateStudioRenderInput(StudioRenderInput{
		Clips: []StudioRenderClip{
			{
				ID:             "clip-audio-demo",
				Type:           "audio",
				Title:          "Demo audio",
				URL:            "audio:travel-theme",
				InPoint:        0,
				OutPoint:       10,
				SourceDuration: 10,
			},
		},
	})
	if err == nil || !strings.Contains(err.Error(), "demo audio") {
		t.Fatalf("expected demo audio validation error, got %v", err)
	}
}

func TestMediaCategoryRecognizesAudioExtensions(t *testing.T) {
	if got := mediaCategory("application/octet-stream", ".m4a"); got != "audio" {
		t.Fatalf("expected .m4a to be audio, got %q", got)
	}
	if !allowedMediaExtension(".flac") {
		t.Fatal("expected .flac to be an allowed media extension")
	}
	if got := mimeTypeForExtension(".wav"); got != "audio/wav" {
		t.Fatalf("expected .wav mime type, got %q", got)
	}
}
