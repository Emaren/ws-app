import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNotificationJobStats,
  createCampaignForm,
  encodeWebPushAudience,
  resolveAudience,
  shortAudienceToken,
  stringifyDetail,
  type NotificationStatus,
  type NotificationJobRecord,
} from "./notificationCampaignSupport";

test("createCampaignForm seeds a clean business-scoped draft", () => {
  const draft = createCampaignForm("biz-1");

  assert.equal(draft.businessId, "biz-1");
  assert.equal(draft.channel, "email");
  assert.equal(draft.audienceMode, "all");
  assert.equal(draft.maxAttempts, "3");
  assert.equal(draft.message, "");
});

test("resolveAudience maps all, segment, and direct targets", () => {
  assert.equal(resolveAudience("all", "ignored"), "all");
  assert.equal(resolveAudience("segment", " vip-east "), "segment:vip-east");
  assert.equal(resolveAudience("direct", " user@example.com "), "user@example.com");
  assert.equal(resolveAudience("segment", "   "), "");
});

test("buildNotificationJobStats summarizes queue states", () => {
  const statuses: NotificationStatus[] = [
    "queued",
    "queued",
    "processing",
    "retrying",
    "sent",
    "failed",
  ];
  const jobs: NotificationJobRecord[] = statuses.map((status, index) => ({
    id: `job-${index}`,
    businessId: "biz-1",
    channel: "email",
    audience: "all",
    subject: null,
    message: "hello",
    metadata: null,
    status,
    provider: "tmail",
    attempts: 1,
    maxAttempts: 3,
    nextAttemptAt: new Date().toISOString(),
    lastAttemptAt: null,
    sentAt: null,
    failedAt: null,
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  assert.deepEqual(buildNotificationJobStats(jobs), {
    queued: 2,
    processing: 1,
    retrying: 1,
    sent: 1,
    failed: 1,
  });
});

test("stringifyDetail and shortAudienceToken stay operator-readable", () => {
  assert.equal(
    stringifyDetail({
      provider: "tmail",
      audience: "vip-east",
      retries: 2,
      muted: false,
      ignored: null,
    }),
    "provider=tmail · audience=vip-east · retries=2 · muted=false",
  );

  assert.equal(shortAudienceToken("short-token"), "short-token");
  assert.equal(
    shortAudienceToken("1234567890abcdef1234567890abcdef1234567890abcdef"),
    "1234567890abcdef...1234567890abcdef",
  );
});

test("encodeWebPushAudience only emits a token for valid subscriptions", () => {
  assert.equal(
    encodeWebPushAudience({
      endpoint: "https://push.example/device",
      keys: {
        p256dh: "p256dh-key",
        auth: "auth-key",
      },
    })?.startsWith("webpush:"),
    true,
  );

  assert.equal(
    encodeWebPushAudience({
      endpoint: "https://push.example/device",
      keys: {
        p256dh: "p256dh-key",
      },
    }),
    null,
  );
});
