import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMemberValueSnapshot } from "./memberValueSnapshot";

test("buildMemberValueSnapshot summarizes rewards, wallets, and premium coverage", () => {
  const snapshot = buildMemberValueSnapshot({
    generatedAt: "2026-03-11T18:00:00.000Z",
    accessTokenPresent: true,
    localUsers: [
      {
        id: "local-tony",
        email: "tony@example.com",
        name: "Tony",
      },
      {
        id: "local-maya",
        email: "maya@example.com",
        name: "Maya",
      },
      {
        id: "local-reader",
        email: "reader@example.com",
        name: "Reader",
      },
    ],
    wsUsers: [
      {
        id: "ws-tony",
        email: "tony@example.com",
        name: "Tony",
      },
      {
        id: "ws-maya",
        email: "maya@example.com",
        name: "Maya",
      },
    ],
    walletLinks: [
      {
        userId: "ws-tony",
        walletAddress: "0x123",
        chainType: "BASE",
        linkedAt: "2026-03-01T10:00:00.000Z",
        lastVerifiedAt: "2026-03-10T10:00:00.000Z",
      },
    ],
    walletError: null,
    subscriptions: [
      {
        userExternalId: "local-tony",
        userEmail: "tony@example.com",
        plan: "PREMIUM_MONTHLY",
        status: "ACTIVE",
        mismatchReason: null,
      },
      {
        userExternalId: null,
        userEmail: "maya@example.com",
        plan: "PREMIUM_YEARLY",
        status: "TRIALING",
        mismatchReason: "stripe_status_mismatch",
      },
    ],
    rewardBalanceRows: [
      {
        userId: "local-tony",
        token: "WHEAT",
        direction: "CREDIT",
        amount: "14.5",
      },
      {
        userId: "local-tony",
        token: "STONE",
        direction: "DEBIT",
        amount: "1.5",
      },
      {
        userId: "local-maya",
        token: "STONE",
        direction: "CREDIT",
        amount: 8,
      },
    ],
    rewardEntriesTotal: 9,
    rewardEntries7d: 4,
    rewardedUsers: 2,
    recentRewards: [
      {
        id: "reward-1",
        token: "WHEAT",
        direction: "CREDIT",
        amount: "10",
        reason: "Article contribution",
        createdAt: "2026-03-11T17:00:00.000Z",
        user: {
          email: "tony@example.com",
          name: "Tony",
        },
        business: {
          name: "Wheat & Stone",
        },
      },
    ],
    remoteRewardReport: {
      summary: {
        totalByToken: {
          WHEAT: 44,
          STONE: 12,
        },
        pendingByToken: {
          WHEAT: 4,
          STONE: 1.5,
        },
        exportedByToken: {
          WHEAT: 20,
          STONE: 3,
        },
        paidByToken: {
          WHEAT: 24,
          STONE: 9,
        },
      },
      byUser: [
        {
          userId: "ws-tony",
          amountByToken: {
            WHEAT: 44,
          },
        },
      ],
    },
    remoteRewardError: null,
  });

  assert.deepEqual(snapshot.summary, {
    rewardEntriesTotal: 9,
    rewardEntries7d: 4,
    rewardedUsers: 2,
    rewardedUsersWithoutWallet: 1,
    linkedWallets: 1,
    verifiedWallets7d: 1,
    trackedSubscriptions: 2,
    activeSubscriptions: 1,
    trialingSubscriptions: 1,
    pastDueSubscriptions: 0,
    subscriptionMismatches: 1,
  });

  assert.deepEqual(snapshot.localRewards.netByToken, {
    WHEAT: 14.5,
    STONE: 6.5,
  });

  assert.deepEqual(snapshot.remoteRewards.pendingByToken, {
    WHEAT: 4,
    STONE: 1.5,
  });

  assert.deepEqual(
    snapshot.topMembers.map((member) => ({
      email: member.email,
      walletLinked: member.walletLinked,
      subscriptionStatus: member.subscription?.status ?? null,
      localNet: member.localNet,
    })),
    [
      {
        email: "tony@example.com",
        walletLinked: true,
        subscriptionStatus: "ACTIVE",
        localNet: {
          WHEAT: 14.5,
          STONE: -1.5,
        },
      },
      {
        email: "maya@example.com",
        walletLinked: false,
        subscriptionStatus: "TRIALING",
        localNet: {
          WHEAT: 0,
          STONE: 8,
        },
      },
    ],
  );
});
