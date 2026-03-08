# Wheat & Stone v100 Roadmap

This file is the plain-English build map for taking Wheat & Stone from a promising review site to a complete organic food review platform.

## What v100 means

At v100, Wheat & Stone is not just publishing articles. It is:

- A trusted organic product review library.
- A local commerce engine for specialty stores and delivery.
- A clean-swap comparison engine between conventional and organic products.
- A membership platform.
- A contributor economy powered by `$WHEAT`.
- A user engagement economy powered by `$STONE`.

## Where we were on March 8, 2026

- The site already had a polished front end, admin tooling, analytics, delivery lead capture, premium billing scaffolding, and reward logic.
- The main bottleneck was structure. Reviews were still mostly long-form articles with hardcoded comparison and ad behavior.
- That meant each new review risked becoming a custom build instead of reusable platform content.

## Build sequence to reach v100

### Phase 1: Turn articles into structured reviews

Plain English:
We stop treating each post like a one-off story and start storing the product facts separately from the prose.

Build goals:

- Add a review profile for each article.
- Capture product name, category, score, verdict, reader guidance, and comparison pair data.
- Show that structured data on the public article page.
- Edit it directly inside the admin form.

Why this matters:
This is the bridge from "blog post" to "review platform."

### Phase 2: Replace hardcoded commerce modules with data-driven modules

Plain English:
Instead of hardwiring one specific milk comparison and one specific delivery ad into code, the admin should be able to choose what appears on a review page.

Build goals:

- Make affiliate comparisons configurable per review.
- Make local delivery modules configurable per store and review.
- Connect stores, offers, and products through shared IDs instead of custom code.

Why this matters:
This is how Wheat & Stone scales past a handful of hand-built pages.

### Phase 3: Build the product graph

Plain English:
A product should exist once in the system and then be reusable across reviews, stores, offers, and comparisons.

Build goals:

- Add canonical products, brands, categories, certifications, and ingredients.
- Link reviews to products.
- Link store inventory and affiliate links to those same products.

Why this matters:
This unlocks real search, filters, comparison pages, and marketplace pages.

### Phase 4: Finish commerce operations

Plain English:
Wheat & Stone should be able to turn attention into purchases without manual juggling.

Build goals:

- Give businesses real store profiles and delivery settings.
- Populate live offers and inventory.
- Make delivery flows and specialty-store referrals trackable end to end.

Why this matters:
This is the point where the site starts acting like a revenue machine, not just a media property.

### Phase 5: Finish premium and auth

Plain English:
Paying members and returning users need a smooth, reliable experience.

Build goals:

- Fix registration edge cases.
- Enable social login providers intentionally.
- Complete Stripe price setup and entitlement coverage.

Why this matters:
Premium cannot become a core pillar until signup and billing feel dependable.

### Phase 6: Activate rewards and settlement

Plain English:
First we track value off-chain. Then we settle it cleanly on-chain.

Build goals:

- Award `$STONE` for user participation.
- Award `$WHEAT` for contributor actions and business-driving outcomes.
- Link wallets.
- Export and reconcile settlement cycles.

Why this matters:
This is how Wheat & Stone becomes a living economy instead of a standard content site.

### Phase 7: Scale discovery and community

Plain English:
Once the engine works, the site needs discovery surfaces that let people browse, compare, trust, and return.

Build goals:

- Product and category search.
- Top-rated pages.
- Store and map discovery.
- Contributor profiles and reputation signals.
- Saved offers and account dashboards.

Why this matters:
This is what makes the platform feel big, useful, and habit-forming.

## Objective v100 scorecard

Wheat & Stone can reasonably call itself v100 when it has all of the following:

- 100+ published review pages.
- 200+ canonical products.
- 25+ onboarded businesses.
- 5+ delivery-enabled stores.
- 10+ live offers.
- 1+ live premium subscription path.
- 1+ live user reward accrual path.
- 1+ contributor reward accrual path.
- 1+ wallet settlement cycle completed.
- 0 hardcoded product comparisons in the article renderer.
- 0 hardcoded store-specific ad logic in the article renderer.
- Clean deploys for both `ws-app` and `ws-api`.

## Current execution play-by-play

### Step 1 underway

We are building structured review profiles directly into the article system.

What changes from a layman's perspective:

- Editors can now tell the system what product a review is about.
- Each review can carry a score and verdict.
- Buying guidance becomes reusable data, not buried in paragraphs.
- The comparison module can be filled in from the editor instead of being hardcoded.

What this unlocks next:

- Searchable product pages.
- Reusable organic vs conventional comparison cards.
- Store and offer matching.
- Reward rules tied to real review entities.
