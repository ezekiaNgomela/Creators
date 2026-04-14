# Architecture

## Core roles
- user
- super_user
- admin

## Service layout
- gateway: public API edge, JWT validation, reverse proxy
- auth-service-next: registration, login, verification, JWT, Google OAuth URL scaffold
- wallet-service: coin balance and wallet transaction orchestration
- subscription-service: channel plans, subscriptions, billing periods
- stream-service: stream pricing and join eligibility

## Product rules
- only `super_user` can create posts and streams
- super users can own private channels
- normal users can subscribe to channels or pay to join streams
- coins are the primary in-app payment unit

## Monetization rules
- 10 coins = 1 USD base conversion
- 30 minute featured stream example = 10 coins
- revenue split default = 80% creator / 10% platform / 10% reserve

## Performance direction
- postgres for durable records
- redis for caching, sessions, rate limits, pub/sub
- minio for media storage
- gateway stays thin and stateless
- move live media delivery to LiveKit or a dedicated media plane when needed
