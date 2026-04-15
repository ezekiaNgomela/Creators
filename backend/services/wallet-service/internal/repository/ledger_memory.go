package repository

import "creators/backend/services/wallet-service/internal/ledger"

type MemoryLedger struct {
	entries []ledger.Entry
}

func NewMemoryLedger() *MemoryLedger {
	return &MemoryLedger{entries: []ledger.Entry{}}
}

func (m *MemoryLedger) Append(entry ledger.Entry) {
	m.entries = append(m.entries, entry)
}

func (m *MemoryLedger) All() []ledger.Entry {
	out := make([]ledger.Entry, len(m.entries))
	copy(out, m.entries)
	return out
}
