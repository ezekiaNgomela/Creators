package service

import "errors"

type Service struct{}

type CreatePostRequest struct {
	ActorRole   string  `json:"actorRole" binding:"required,oneof=super_user admin user"`
	SuperUserID string  `json:"superUserId" binding:"required"`
	ChannelID   string  `json:"channelId"`
	Title       string  `json:"title" binding:"required"`
	Caption     string  `json:"caption"`
	Visibility  string  `json:"visibility" binding:"required,oneof=public subscriber_only paid"`
	PriceCoins  float64 `json:"priceCoins"`
	ProductType string  `json:"productType" binding:"required,oneof=content business digital"`
}

type PostAccessRequest struct {
	ViewerID      string `json:"viewerId" binding:"required"`
	Visibility    string `json:"visibility" binding:"required,oneof=public subscriber_only paid"`
	PaymentState  string `json:"paymentState"`
	Subscribed    bool   `json:"subscribed"`
	ChannelID     string `json:"channelId"`
	SuperUserID   string `json:"superUserId" binding:"required"`
	PostID        string `json:"postId" binding:"required"`
}

func New() *Service { return &Service{} }

func (s *Service) CreatePost(req CreatePostRequest) (map[string]any, error) {
	if req.ActorRole != "super_user" && req.ActorRole != "admin" {
		return nil, errors.New("only super users can create posts")
	}
	if req.Visibility == "paid" && req.PriceCoins <= 0 {
		return nil, errors.New("paid posts require a positive coin price")
	}
	return map[string]any{
		"status":      "post_created",
		"superUserId": req.SuperUserID,
		"visibility":  req.Visibility,
		"productType": req.ProductType,
		"security":    "protected media URLs must be signed only after server-side access checks",
	}, nil
}

func (s *Service) CheckPostAccess(req PostAccessRequest) (map[string]any, error) {
	switch req.Visibility {
	case "public":
		return map[string]any{"allowed": true, "reason": "public"}, nil
	case "subscriber_only":
		if !req.Subscribed {
			return nil, errors.New("subscriber access required")
		}
		return map[string]any{"allowed": true, "reason": "subscription active"}, nil
	case "paid":
		if req.PaymentState != "settled" {
			return nil, errors.New("paid post not settled")
		}
		return map[string]any{"allowed": true, "reason": "payment settled"}, nil
	default:
		return nil, errors.New("unsupported visibility")
	}
}
