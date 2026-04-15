package store

type Wallet struct {
	UserID      string  `json:"userId"`
	CoinBalance float64 `json:"coinBalance"`
}

type Transaction struct {
	UserID      string                 `json:"userId"`
	Direction   string                 `json:"direction"`
	AmountCoins float64                `json:"amountCoins"`
	Reason      string                 `json:"reason"`
	ReferenceID string                 `json:"referenceId,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}
