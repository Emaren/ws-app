# Billing Reconciliation API (Step 11b)

This document defines the ws-app monetization integrity surface added in step `11b`.

## Goals

- Persist local subscription entitlements.
- Keep local entitlements synchronized with Stripe lifecycle events.
- Give owner/admin operators a reconciliation UI + repair actions.

## Data model

Prisma model: `SubscriptionEntitlement`

Main fields:

- `userExternalId` (maps to authenticated ws-api user id)
- `userEmail`
- `plan` (`FREE`, `PREMIUM_MONTHLY`, `PREMIUM_YEARLY`, `CUSTOM`)
- `status` (`NONE`, `INCOMPLETE`, `TRIALING`, `ACTIVE`, etc.)
- `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`
- billing period + sync metadata fields

## API endpoints

### `POST /api/checkout`

Creates Stripe Checkout session for authenticated users and seeds local entitlement state.

Behavior:

- Requires authenticated session.
- Supports `plan` request body (`premium_monthly`, `premium_yearly`).
- Attaches user metadata to Stripe checkout + subscription.

### `POST /api/stripe/webhook`

Stripe webhook receiver for entitlement synchronization.

Expected env:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Handled events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.paid`
- `invoice.payment_failed`

### `GET /api/premium/entitlement`

Returns entitlement snapshot for the authenticated user.

Response shape:

- `entitlement`: normalized local state
- `hasPremiumAccess`: boolean access decision

### `GET /api/admin/billing/reconciliation`

Owner/admin-only reconciliation read endpoint.

Response includes:

- `stripeAvailable`
- `summary` (`total`, `inSync`, `mismatched`)
- `records[]` each with local vs Stripe snapshot + `mismatchReasons[]`

### `POST /api/admin/billing/reconciliation`

Owner/admin-only action endpoint.

Request body:

- `entitlementId: string`
- `action: "sync_from_stripe" | "reset_to_free"`

Actions:

- `sync_from_stripe`: pulls freshest Stripe subscription state into local entitlement.
- `reset_to_free`: hard-resets entitlement to free/no-subscription local state.

## Admin UI

Route: `GET /admin/billing`

Features:

- role-gated for `OWNER`/`ADMIN`
- summary cards
- per-record mismatch diagnostics
- one-click repair actions

## Operational notes

- Webhook must be reachable by Stripe and configured with matching signing secret.
- Reconciliation still works without webhook history by using manual `sync_from_stripe`.
- For production, ensure the same database backing auth identity and entitlement records (or keep `userExternalId` mapping stable across services).
