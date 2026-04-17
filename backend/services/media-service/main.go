package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Post struct {
	ID        string `json:"id"`
	Creator   string `json:"creator"`
	Title     string `json:"title"`
	MediaType string `json:"mediaType"`
	VideoURL  string `json:"videoUrl,omitempty"`
	CreatedAt string `json:"createdAt"`
}

func main() {
	r := gin.Default()
	r.Use(mediaCacheHeaders())

	r.POST("/api/media/uploads", uploadHandler)
	r.POST("/api/media/posts/publish", publishHandler)
	r.GET("/api/feed/home", feedHomeHandler)

	r.Static("/uploads", "./uploads")
	r.Static("/hls", "./processed")

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "4010"
	}

	r.Run(":" + port)
}

func mediaCacheHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		switch {
		case strings.HasSuffix(path, ".m3u8"):
			c.Header("Cache-Control", "public, max-age=30")
		case strings.HasSuffix(path, ".ts"):
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		case strings.HasPrefix(path, "/uploads/"):
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		}
		c.Next()
	}
}

func uploadHandler(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
		return
	}

	creatorId := c.PostForm("creatorId")
	assetKey := creatorId + "/" + file.Filename

	path := filepath.Join("uploads", assetKey)
	if err := os.MkdirAll(filepath.Dir(path), os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "mkdir failed"})
		return
	}

	if err := c.SaveUploadedFile(file, path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "upload failed"})
		return
	}

	c.JSON(200, gin.H{"assetKey": assetKey})
}

func publishHandler(c *gin.Context) {
	var body struct {
		CreatorId string `json:"creatorId"`
		AssetKey  string `json:"assetKey"`
		Caption   string `json:"caption"`
		MediaType string `json:"mediaType"`
	}

	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid"})
		return
	}

	post := Post{
		ID:        body.AssetKey,
		Creator:   body.CreatorId,
		Title:     body.Caption,
		MediaType: body.MediaType,
		VideoURL:  buildMediaURL(body.AssetKey, body.MediaType),
		CreatedAt: time.Now().Format(time.RFC3339),
	}

	posts, _ := readPosts()
	posts = append([]Post{post}, posts...)
	if err := writePosts(posts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "persist failed"})
		return
	}

	c.JSON(200, post)
}

func buildMediaURL(assetKey string, mediaType string) string {
	base := strings.TrimRight(os.Getenv("PUBLIC_MEDIA_BASE_URL"), "/")
	if base == "" {
		base = "http://localhost:4010"
	}

	if mediaType == "video" {
		return base + "/hls/" + assetKey + "/index.m3u8"
	}

	return base + "/uploads/" + assetKey
}

func feedHomeHandler(c *gin.Context) {
	posts, _ := readPosts()
	c.JSON(200, posts)
}

func readPosts() ([]Post, error) {
	path := filepath.Join("data", "posts.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []Post{}, nil
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var posts []Post
	if len(b) == 0 {
		return []Post{}, nil
	}
	if err := json.Unmarshal(b, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

func writePosts(posts []Post) error {
	path := filepath.Join("data", "posts.json")
	if err := os.MkdirAll(filepath.Dir(path), os.ModePerm); err != nil {
		return err
	}
	b, err := json.MarshalIndent(posts, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0644)
}
