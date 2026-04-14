# Security hardening

## Authentication
- Never allow purchases, stream joins, or wallet operations without an authenticated user context.
- Password login must stay server-side validated.
- Hash passwords with a strong password hashing algorithm.
- Require email verification for super users before creator actions.
- Support Google OAuth as an additional login method, not a replacement for server authorization.
- Rate limit login, registration, password reset, and verification endpoints.
- Store minimal JWT claims and keep short expirations.
- Use refresh token rotation for long sessions.
- Do not trust role claims from the client.
- Enforce RBAC server-side for post creation, stream creation, channel management, promotions, and withdrawals.

## Wallet and transactions
- Treat the wallet as an append-only ledger.
- Never trust client-submitted prices or balances.
- Lookup stream price, post price, promotion price, and subscription price on the server.
- Use idempotency keys for every purchase or charge endpoint.
- Lock wallet rows or use transactional balance checks before debit.
- Record every split explicitly: creator share, platform share, reserve share.
- Verify webhook signatures for payment providers before crediting coins.
- Require audit logs for admin balance adjustments.
- Block negative balances unless explicitly allowed by policy.
- Separate purchase intent creation from ledger settlement.

## Paid content and stream access
- Only super users can create paid posts, paid streams, or subscription plans.
- Paid stream join should mint a short-lived access ticket only after access checks pass.
- Subscriber-only channels and posts must re-check active subscription state at read time.
- Promotions should spend creator balance through wallet service, not direct balance writes.
