import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthTrailEntries,
  formatMoney,
  matchesUsersAtlasQuery,
  preferenceLabel,
  roleTone,
  shortAddress,
  userInitials,
  type AdminUserRecord,
} from "./adminUsersControlTowerSupport";

function createUser(overrides?: Partial<AdminUserRecord>): AdminUserRecord {
  return {
    id: "user-1",
    email: "tonyblum@me.com",
    name: "Tony Blum",
    role: "OWNER",
    registeredVia: "GOOGLE",
    registeredAt: "2026-03-12T12:00:00.000Z",
    lastAuthProvider: "GOOGLE",
    lastAuthAt: "2026-03-12T13:00:00.000Z",
    createdAt: "2026-03-12T12:00:00.000Z",
    experience: {
      profileImageUrl: null,
      theme: "luxe",
      skin: "amber-night",
      siteVersion: "20260312",
      personalDigestEnabled: true,
      digestCadenceHours: 24,
      lastDigestAt: null,
      lastSeenAt: "2026-03-12T13:30:00.000Z",
      lastSeenPath: "/products/milk",
      history: [],
    },
    wallet: null,
    balances: { STONE: 10 },
    subscription: null,
    statusFlags: {
      isContributor: true,
      ownsBusinesses: false,
      hasWalletLinked: false,
      hasPremium: false,
    },
    counts: {
      articles: 1,
      comments: 0,
      reactions: 2,
      analyticsEvents: 5,
      rewardEntries: 1,
      savedProducts: 2,
      savedOffers: 1,
      deliveryLeads: 0,
      businessesOwned: 0,
      offerInbox: 0,
    },
    analyticsSummary: {},
    reactionSummary: {
      byType: {},
      byScope: {},
    },
    authoredArticles: [],
    recentComments: [],
    savedProducts: [],
    savedOffers: [],
    recentReactions: [],
    recentAnalytics: [],
    recentRewards: [],
    recentDeliveryLeads: [],
    authHistory: {
      registrations: [
        {
          id: "reg-1",
          userId: "user-1",
          email: "tonyblum@me.com",
          method: "GOOGLE",
          status: "SUCCESS",
          failureCode: null,
          failureMessage: null,
          createdAt: "2026-03-12T13:00:00.000Z",
        },
      ],
      funnel: [
        {
          id: "funnel-1",
          stage: "LOGIN_STARTED",
          method: "GOOGLE",
          sourceContext: "header",
          createdAt: "2026-03-12T12:55:00.000Z",
        },
      ],
    },
    businessesOwned: [],
    offerInbox: {
      counts: {},
      recent: [],
    },
    ...overrides,
  };
}

test("matchesUsersAtlasQuery filters by name, email, role, skin, and version", () => {
  const user = createUser();

  assert.equal(matchesUsersAtlasQuery(user, "tony"), true);
  assert.equal(matchesUsersAtlasQuery(user, "owner"), true);
  assert.equal(matchesUsersAtlasQuery(user, "amber-night"), true);
  assert.equal(matchesUsersAtlasQuery(user, "20260312"), true);
  assert.equal(matchesUsersAtlasQuery(user, "not-there"), false);
});

test("buildAuthTrailEntries merges auth registrations and funnel steps", () => {
  const trail = buildAuthTrailEntries(createUser());

  assert.equal(trail.length, 2);
  assert.equal(trail[0]?.title, "SUCCESS");
  assert.match(trail[0]?.subtitle ?? "", /GOOGLE/);
  assert.equal(trail[1]?.title, "LOGIN_STARTED");
});

test("formatting helpers stay operator-readable", () => {
  assert.equal(formatMoney(799), "$7.99");
  assert.equal(shortAddress("0x1234567890abcdef1234567890abcdef12345678"), "0x12345678...12345678");
  assert.equal(userInitials("Tony Blum", "tonyblum@me.com"), "TB");
  assert.equal(preferenceLabel("digestCadenceHours"), "Digest cadence");
  assert.match(roleTone("OWNER"), /amber/);
});
