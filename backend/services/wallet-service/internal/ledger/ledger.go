package ledger

type Entry struct {
	UserID      string                 `json:"userId"`
	Direction   string                 `json:"direction"`
	AmountCoins float64                `json:"amountCoins"`
	Reason      string                 `json:"reason"`
	ReferenceID string                 `json:"referenceId,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

func PurchaseCoins(userID string, coins float64, usd float64) Entry {
	return Entry{
		UserID:      userID,
		Direction:   "credit",
		AmountCoins: coins,
		Reason:      "purchase",
		Metadata: map[string]interface{}{
			"usd": usd,
		},
	}
}

func DebitForStream(userID string, coins float64, streamID string) Entry {
	return Entry{
		UserID:      userID,
		Direction:   "debit",
		AmountCoins: coins,
		Reason:      "stream_pay",
		ReferenceID: streamID,
	}
}

func DebitForSubscription(userID string, coins float64, planID string) Entry {
	return Entry{
		UserID:      userID,
		Direction:   "debit",
		AmountCoins: coins,
		Reason:      "subscription_pay",
		ReferenceID: planID,
	}
}

func DebitForPromotion(userID string, coins float64, campaignID string) Entry {
	return Entry{
		UserID:      userID,
		Direction:   "debit",
		AmountCoins: coins,
		Reason:      "promotion_pay",
		ReferenceID: campaignID,
	}
}

func CreditCreator(userID string, coins float64, referenceID string) Entry {
	return Entry{
		UserID:      userID,
		Direction:   "credit",
		AmountCoins: coins,
		Reason:      "creator_earning",
		ReferenceID: referenceID,
	}
}
