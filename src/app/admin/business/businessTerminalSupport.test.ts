import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countdownLabel,
  isOfferLiveNow,
  remainingUnits,
  remainingUnitsCount,
  type OfferRecord,
} from "./businessTerminalSupport";

test("remainingUnitsCount and remainingUnits handle capped offer inventory", () => {
  assert.equal(remainingUnitsCount(12, 5), 7);
  assert.equal(remainingUnitsCount(12, 20), 0);
  assert.equal(remainingUnitsCount(null, 4), null);
  assert.equal(remainingUnits(12, 5), "7");
  assert.equal(remainingUnits(null, 4), "n/a");
});

test("countdownLabel reports upcoming, active, and expired windows", () => {
  const now = Date.parse("2026-03-12T12:00:00.000Z");

  assert.equal(
    countdownLabel("2026-03-12T12:01:30.000Z", "2026-03-12T12:10:00.000Z", now),
    "Starts in 1m 30s",
  );
  assert.equal(
    countdownLabel("2026-03-12T11:59:00.000Z", "2026-03-12T12:30:00.000Z", now),
    "Ends in 30m 0s",
  );
  assert.equal(
    countdownLabel("2026-03-12T11:00:00.000Z", "2026-03-12T11:30:00.000Z", now),
    "Expired",
  );
});

test("isOfferLiveNow only returns true for live offers inside the active window with stock left", () => {
  const liveOffer: OfferRecord = {
    id: "offer-live",
    businessId: "biz-1",
    inventoryItemId: "inv-1",
    title: "Live deal",
    description: null,
    status: "LIVE",
    discountPriceCents: 699,
    startsAt: "2026-03-12T11:30:00.000Z",
    endsAt: "2026-03-12T12:30:00.000Z",
    unitsTotal: 20,
    unitsClaimed: 5,
    featured: true,
    ctaUrl: null,
    updatedAt: "2026-03-12T11:35:00.000Z",
  };
  const now = Date.parse("2026-03-12T12:00:00.000Z");

  assert.equal(isOfferLiveNow(liveOffer, now), true);
  assert.equal(
    isOfferLiveNow(
      {
        ...liveOffer,
        status: "PAUSED",
      },
      now,
    ),
    false,
  );
  assert.equal(
    isOfferLiveNow(
      {
        ...liveOffer,
        unitsClaimed: 20,
      },
      now,
    ),
    false,
  );
  assert.equal(
    isOfferLiveNow(
      {
        ...liveOffer,
        startsAt: "2026-03-12T12:10:00.000Z",
      },
      now,
    ),
    false,
  );
});
