package service

import "errors"

type Service struct{}

type CreatePostRequest struct {
	AuthorUserID string  `json:"authorUserId" binding:"required"`
	AuthorRole   string  `json:"authorRole" binding:"required"`
	ChannelID    string  `json:"channelId"`
	Title        string  `json:"title" binding:"required"`
	Visibility   string  `json:"visibility" binding:"required,oneof=public subscriber_only paid"`
	PriceCoins   float64 `json:"priceCoins"`
	ContentType  string  `json:"contentType" binding:"required,oneof=post product business"`
}

type PostAccessRequest struct {
	ViewerUserID string `json:"viewerUserId" binding:"required"`
	Visibility   string `json:"visibility" binding:"required,oneof=public subscriber_only paid"`
	ChannelID    string `json:"channelId"`
	PaymentState string `json:"paymentState"`
}

func New() *Service { return &Service{} }

func (s *Service) CreatePost(req CreatePostRequest) (map[string]any, error) {
	if req.AuthorRole != "super_user" {
		return nil, errors.New("only super users can create posts or sell content")
	}
	if req.Visibility == "paid" && req.PriceCoins <= 0 {
		return nil, errors.New("paid posts must include server-approved price")
	}
	return map[string]any{
		"status":      "post_created",
		"contentType": req.ContentType,
		"visibility":  req.Visibility,
		"security":    "media delivery must be behind signed URLs and access checks",
	}, nil
}

func (s *Service) CheckPostAccess(req PostAccessRequest) (map[string]any, error) {
	switch req.Visibility {
	case "public":
		return map[string]any{"allowed": true, "reason": "public"}, nil
	case "subscriber_only":
		if req.ChannelID == "" {
			return nil, errors.New("channel context required")
		}
		return map[string]any{"allowed": true, "reason": "requires active channel subscription"}, nil
	case "paid":
		if req.PaymentState != "settled" {
			return nil, errors.New("paid post not settled")
		}
		return map[string]any{"allowed": true, "reason": "paid purchase settled"}, nil
	default:
		return nil, errors.New("unsupported visibility")
	}
}
