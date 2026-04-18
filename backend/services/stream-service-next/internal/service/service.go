package service

import "errors"

type Service struct{}

type CreateStreamRequest struct {
	HostUserID   string  `json:"hostUserId" binding:"required"`
	HostRole     string  `json:"hostRole" binding:"required,oneof=super_user admin user"`
	HostVerified bool    `json:"hostVerified"`
	Title        string  `json:"title" binding:"required"`
	Visibility   string  `json:"visibility" binding:"required,oneof=public subscriber_only paid"`
	PriceCoins   float64 `json:"priceCoins"`
}

type JoinStreamRequest struct {
	ViewerUserID   string `json:"viewerUserId" binding:"required"`
	Visibility     string `json:"visibility" binding:"required,oneof=public subscriber_only paid"`
	Subscribed     bool   `json:"subscribed"`
	PaymentState   string `json:"paymentState"`
	MinutesPlanned int    `json:"minutesPlanned"`
}

func New() *Service { return &Service{} }

func (s *Service) CreateStream(req CreateStreamRequest) (map[string]any, error) {
	if req.HostRole != "super_user" && req.HostRole != "admin" {
		return nil, errors.New("only super users can create streams")
	}
	if req.HostRole == "super_user" && !req.HostVerified {
		return nil, errors.New("super user must verify email before starting streams")
	}
	if req.Visibility == "paid" && req.PriceCoins <= 0 {
		return nil, errors.New("paid streams require a positive coin price")
	}

	return map[string]any{
		"status":      "stream_created",
		"hostUserId":  req.HostUserID,
		"title":       req.Title,
		"visibility":  req.Visibility,
		"security":    "stream host access and room creation must be enforced server-side",
		"pricingRule": "wallet charge should be settled before opening paid stream playback",
	}, nil
}

func (s *Service) JoinCheck(req JoinStreamRequest) (map[string]any, error) {
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
			return nil, errors.New("paid stream not settled")
		}
		return map[string]any{
			"allowed":        true,
			"reason":         "payment settled",
			"minutesPlanned": req.MinutesPlanned,
		}, nil
	default:
		return nil, errors.New("unsupported visibility")
	}
}
