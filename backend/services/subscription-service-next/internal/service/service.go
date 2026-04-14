package service

import "errors"

type Service struct{}

type SubscribeRequest struct {
	UserID     string `json:"userId" binding:"required"`
	ChannelID  string `json:"channelId" binding:"required"`
	PlanID     string `json:"planId" binding:"required"`
	Billing    string `json:"billing" binding:"required,oneof=monthly yearly"`
	PaymentRef string `json:"paymentRef" binding:"required"`
}

type AccessCheckRequest struct {
	UserID       string `json:"userId" binding:"required"`
	SuperUserID  string `json:"superUserId" binding:"required"`
	ChannelID    string `json:"channelId"`
	ResourceType string `json:"resourceType" binding:"required,oneof=channel post stream"`
	ResourceID   string `json:"resourceId" binding:"required"`
	Visibility   string `json:"visibility" binding:"required,oneof=public subscriber_only paid"`
	PaymentState string `json:"paymentState"`
}

func New() *Service { return &Service{} }

func (s *Service) Subscribe(req SubscribeRequest) (map[string]any, error) {
	return map[string]any{
		"status":     "subscription_created",
		"userId":     req.UserID,
		"channelId":  req.ChannelID,
		"planId":     req.PlanID,
		"billing":    req.Billing,
		"paymentRef": req.PaymentRef,
		"security":   "final activation should happen only after wallet or provider settlement is confirmed",
	}, nil
}

func (s *Service) CheckAccess(req AccessCheckRequest) (map[string]any, error) {
	switch req.Visibility {
	case "public":
		return map[string]any{"allowed": true, "reason": "public"}, nil
	case "subscriber_only":
		if req.ChannelID == "" {
			return nil, errors.New("subscriber-only resource requires channel context")
		}
		return map[string]any{
			"allowed": true,
			"reason":  "active subscription required and must be checked against live status in persistent storage",
		}, nil
	case "paid":
		if req.PaymentState != "settled" {
			return nil, errors.New("payment not settled")
		}
		return map[string]any{"allowed": true, "reason": "paid access settled"}, nil
	default:
		return nil, errors.New("unsupported visibility")
	}
}
