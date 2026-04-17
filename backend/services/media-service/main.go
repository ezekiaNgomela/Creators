package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
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

	r.POST("/api/media/uploads", uploadHandler)
	r.POST("/api/media/posts/publish", publishHandler)
	r.GET("/api/feed/home", feedHomeHandler)

	r.Static("/uploads", "./uploads")

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	r.Run(":4010")
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
	os.MkdirAll(filepath.Dir(path), os.ModePerm)

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
		VideoURL:  "/uploads/" + body.AssetKey,
		CreatedAt: time.Now().Format(time.RFC3339),
	}

	posts, _ := readPosts()
	posts = append([]Post{post}, posts...)
	writePosts(posts)

	c.JSON(200, post)
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
	json.Unmarshal(b, &posts)
	return posts, nil
}

func writePosts(posts []Post) error {
	path := filepath.Join("data", "posts.json")
	os.MkdirAll(filepath.Dir(path), os.ModePerm)
	b, _ := json.MarshalIndent(posts, "", "  ")
	return os.WriteFile(path, b, 0644)
}
