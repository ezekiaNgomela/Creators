package main

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.POST("/api/media/uploads", uploadHandler)
	r.POST("/api/media/posts/publish", publishHandler)

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

	c.JSON(200, gin.H{
		"assetKey": assetKey,
	})
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

	c.JSON(200, gin.H{
		"id": "post_" + body.AssetKey,
		"creator": body.CreatorId,
		"title": body.Caption,
		"videoUrl": "/uploads/" + body.AssetKey,
	})
}
