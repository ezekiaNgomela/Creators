# Service map

## Core services
- auth-service: registration, login, verification, oauth
- user-service: profile, follow graph, creator discovery
- subscription-service: plans, channel subscriptions, entitlement checks
- wallet-service: coin balances, purchases, payouts, ledger
- post-service: posts, galleries, paid content access
- stream-service: stream rooms, tickets, live access pricing
- chat-service: private messaging and room chat
- promotion-service: highlighted placement and impression delivery
- notification-service: email, in-app alerts, verification, receipts

## Gateway responsibilities
- route requests to domain services
- expose a stable /api surface
- issue request IDs and propagate headers
- apply auth middleware and rate limits later

## Web app domains
- auth
- home feed
- creators
- channels
- wallet
- streams
- promotions
- settings

## Optimization rules
- keep chat and streaming isolated from heavy CRUD traffic
- use wallet ledger writes as append-only operations
- do authorization checks at the domain service, not only in the gateway
- use signed URLs for media delivery
- keep promotion impression counting async-ready
