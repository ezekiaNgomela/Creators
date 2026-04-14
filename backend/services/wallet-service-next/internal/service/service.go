package service

import (
	"errors"
	"fmt"
	"strings"
)

type Service struct{}

type CoinPurchaseIntentRequest struct {
	UserID string `json:"userId" binding:"required"`
	Coins  int    `json:"coins" binding:"required,min=10"`
}

type ChargeRequest struct {
	UserID      string `json:"userId" binding:"required"`
	Resource    string `json:"resource" binding:"required,oneof=stream_join post_unlock subscription promotion"`
	ResourceID  string `json:"resourceId" binding:"required"`
	MinutesUsed int    `json:"minutesUsed"`
}

func New() *Service { return &Service{} }

func (s *Service) Pricing() map[string]any {
	return map[string]any{
		"coins": map[string]any{
			"base": "10 coins = 1 USD",
		},
		"streams": map[string]any{
			"perMinute": 0.1,
			"featured30Min": 10,
		},
		"split": map[string]any{
			"creatorPct": 80,
			"platformPct": 10,
			"reservePct": 10,
		},
	}
}

func (s *Service) CreateCoinPurchaseIntent(req CoinPurchaseIntentRequest, idempotencyKey string) (map[string]any, error) {
	if strings.TrimSpace(idempotencyKey) == "" {
		return nil, errors.New("missing idempotency key")
	}
	usd := float64(req.Coins) / 10.0
	return map[string]any{
		"status":          "intent_created",
		"userId":          req.UserID,
		"coins":           req.Coins,
		"usd":             usd,
		"idempotencyKey":  idempotencyKey,
		"securityRule":    "final wallet credit must happen only after verified provider callback",
		"providerEnvelope": "scaffold-next",
	}, nil
}

func (s *Service) Charge(req ChargeRequest, idempotencyKey string) (map[string]any, error) {
	if strings.TrimSpace(idempotencyKey) == "" {
		return nil, errors.New("missing idempotency key")
	}
	price, pricingRule, err := serverSidePrice(req)
	if err != nil {
		return nil, err
	}
	creatorShare := price * 0.80
	platformShare := price * 0.10
	reserveShare := price * 0.10
	return map[string]any{
		"status":          "charge_authorized",
		"userId":          req.UserID,
		"resource":        req.Resource,
		"resourceId":      req.ResourceID,
		"priceCoins":      price,
		"pricingRule":     pricingRule,
		"creatorShare":    creatorShare,
		"platformShare":   platformShare,
		"reserveShare":    reserveShare,
		"idempotencyKey":  idempotencyKey,
		"securityRule":    "balance and ledger settlement must be executed in one transaction with server-side access checks",
	}, nil
}

func serverSidePrice(req ChargeRequest) (float64, string, error) {
	switch req.Resource {
	case "stream_join":
		if req.MinutesUsed >= 30 {
			return 10, "flat_30min", nil
		}
		if req.MinutesUsed > 0 {
			return float64(req.MinutesUsed) * 0.1, "per_minute", nil
		}
		return 10, "default_stream_ticket", nil
	case "promotion":
		return 10, "10000_impression_campaign", nil
	case "subscription":
		return 10, "example_monthly_subscription", nil
	case "post_unlock":
		return 5, "example_paid_post", nil
	default:
		return 0, "", fmt.Errorf("unsupported resource")
	}
}
