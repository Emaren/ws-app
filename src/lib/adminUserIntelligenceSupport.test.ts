import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRegistrationHistory,
  mergeTrackedBalances,
  parseEventPath,
  parseTrackedTokenSymbols,
} from "./adminUserIntelligenceSupport";

test("parseTrackedTokenSymbols normalizes configured symbols and keeps defaults", () => {
  assert.deepEqual(parseTrackedTokenSymbols(" stone , wheat , farm , BAD!, farm "), [
    "WHEAT",
    "STONE",
    "TOKEN",
    "FARM",
  ]);
});

test("mergeTrackedBalances combines local and remote token maps", () => {
  assert.deepEqual(
    mergeTrackedBalances(
      { STONE: 5, WHEAT: -1 },
      { STONE: 2.5, TOKEN: 3 },
    ),
    {
      WHEAT: -1,
      STONE: 7.5,
      TOKEN: 3,
    },
  );
});

test("parseEventPath prefers pagePath metadata before source context and destination", () => {
  assert.equal(
    parseEventPath({
      sourceContext: "header",
      metadata: { pagePath: "/offers/weekend-drop" },
      destinationUrl: "https://wheatandstone.ca/offers",
    }),
    "/offers/weekend-drop",
  );
  assert.equal(
    parseEventPath({
      sourceContext: "header",
      metadata: null,
      destinationUrl: "https://wheatandstone.ca/offers",
    }),
    "header",
  );
});

test("buildRegistrationHistory deduplicates and sorts merged auth events", () => {
  const user = {
    id: "user-1",
    email: "tonyblum@me.com",
    authRegistrationEvents: [
      {
        id: "local-1",
        method: "GOOGLE",
        status: "SUCCESS",
        failureCode: null,
        failureMessage: null,
        createdAt: new Date("2026-03-12T10:00:00.000Z"),
      },
    ],
  } as {
    id: string;
    email: string;
    authRegistrationEvents: Array<{
      id: string;
      method: string;
      status: string;
      failureCode: string | null;
      failureMessage: string | null;
      createdAt: Date;
    }>;
  } & Parameters<typeof buildRegistrationHistory>[0];

  const history = buildRegistrationHistory(
    user,
    new Map([
      [
        "user-1",
        [
          {
            id: "user-1-remote",
            userId: "user-1",
            email: "tonyblum@me.com",
            method: "GOOGLE",
            status: "SUCCESS",
            failureCode: null,
            failureMessage: null,
            createdAt: "2026-03-12T11:00:00.000Z",
          },
        ],
      ],
    ]),
    new Map([
      [
        "tonyblum@me.com",
        [
          {
            id: "local-1",
            userId: "user-1",
            email: "tonyblum@me.com",
            method: "GOOGLE",
            status: "SUCCESS",
            failureCode: null,
            failureMessage: null,
            createdAt: "2026-03-12T10:00:00.000Z",
          },
        ],
      ],
    ]),
  );

  assert.equal(history.length, 2);
  assert.equal(history[0]?.id, "user-1-remote");
  assert.equal(history[1]?.id, "local-1");
});
