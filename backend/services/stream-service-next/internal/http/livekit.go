package http

import (
	"net/http"
	"os"
	"time"

	lksdk "github.com/livekit/server-sdk-go/v2"
	"github.com/gin-gonic/gin"
)

type LiveKitTokenRequest struct {
	RoomName string `json:"roomName"`
	UserID   string `json:"userId"`
	IsHost   bool   `json:"isHost"`
}

func GenerateLiveKitToken(c *gin.Context) {
	var req LiveKitTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	apiKey := os.Getenv("LIVEKIT_API_KEY")
	apiSecret := os.Getenv("LIVEKIT_API_SECRET")
	livekitURL := os.Getenv("LIVEKIT_URL")

	at := lksdk.NewAccessToken(apiKey, apiSecret)
	at.SetIdentity(req.UserID)
	at.SetValidFor(6 * time.Hour)

	grant := &lksdk.VideoGrant{
		RoomJoin:     true,
		Room:         req.RoomName,
		CanPublish:   req.IsHost,
		CanSubscribe: true,
	}
	at.AddGrant(grant)

	token, err := at.ToJWT()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"url":   livekitURL,
	})
}
