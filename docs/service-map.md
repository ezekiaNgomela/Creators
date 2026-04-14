# Service map

## Gateway
Single entry for web and mobile clients.
Responsibilities:
- auth pass-through
- route grouping
- request correlation id
- health aggregation
- future rate limits

## Auth
- email and password registration
- Google OAuth handoff
- JWT issuing
- super user verification

## User
- public profiles
- follow graph
- home feed personalization
- promoted creator visibility

## Subscription
- channel plans
- monthly and yearly billing
- private channel membership
- access checks for paid posts and streams

## Wallet
- coin purchases
- ledger transactions
- creator revenue share
- platform and reserve splits

## Post
- public posts
- paid posts
- subscriber-only posts
- product or business listing content

## Stream
- stream sessions
- pay-to-join live access
- subscriber-only live access
- time-based charging rules

## Promotion
- creator highlight campaigns
- impression budgets
- delivery counters

## Notification
- email verification
- purchase confirmations
- subscription renewals
- stream reminders
