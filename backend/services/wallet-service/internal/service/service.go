package service

import (
	"creators/backend/pkg/finance"
	"creators/backend/services/wallet-service/internal/ledger"
	"creators/backend/services/wallet-service/internal/repository"
)

type Service struct {
	ledgerRepo *repository.MemoryLedger
}

func New(ledgerRepo *repository.MemoryLedger) *Service {
	return &Service{ledgerRepo: ledgerRepo}
}

func (s *Service) Purchase(userID string, coins float64, usd float64) ledger.Entry {
	entry := ledger.PurchaseCoins(userID, coins, usd)
	s.ledgerRepo.Append(entry)
	return entry
}

func (s *Service) ChargeForStream(userID string, coins float64, streamID string, creatorID string) []ledger.Entry {
	debit := ledger.DebitForStream(userID, coins, streamID)
	creatorShare, _, _ := finance.Split(coins)
	credit := ledger.CreditCreator(creatorID, creatorShare, streamID)
	s.ledgerRepo.Append(debit)
	s.ledgerRepo.Append(credit)
	return []ledger.Entry{debit, credit}
}

func (s *Service) ChargeForSubscription(userID string, coins float64, planID string, creatorID string) []ledger.Entry {
	debit := ledger.DebitForSubscription(userID, coins, planID)
	creatorShare, _, _ := finance.Split(coins)
	credit := ledger.CreditCreator(creatorID, creatorShare, planID)
	s.ledgerRepo.Append(debit)
	s.ledgerRepo.Append(credit)
	return []ledger.Entry{debit, credit}
}

func (s *Service) All() []ledger.Entry {
	return s.ledgerRepo.All()
}
