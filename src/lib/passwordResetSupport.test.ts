import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  PASSWORD_RESET_EMAIL_SUBJECT,
  resolvePasswordResetEmailConfig,
  sendPasswordResetEmail,
  shouldExposeDebugResetUrl,
} from "./passwordResetSupport";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, ORIGINAL_ENV);
}

function applyEnv(overrides: Record<string, string | undefined>) {
  resetEnv();

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "undefined") {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

afterEach(() => {
  resetEnv();
});

test("resolvePasswordResetEmailConfig infers the default Wheat & Stone TMail identity", () => {
  applyEnv({
    AUTH_EMAIL_PROVIDER: "tmail",
    AUTH_EMAIL_API_KEY: "tmail-secret",
    AUTH_EMAIL_FROM: "info@wheatandstone.ca",
    AUTH_EMAIL_API_BASE_URL: "https://api.tmail.example/api",
    AUTH_EMAIL_TMAIL_IDENTITY_ID: undefined,
  });

  const config = resolvePasswordResetEmailConfig();

  assert.equal(config.provider, "tmail");
  assert.equal(config.configured, true);
  assert.equal(config.tmailIdentityId, "ws-info");
  assert.equal(config.apiBaseUrl, "https://api.tmail.example/api");
});

test("sendPasswordResetEmail sends a live TMail password reset payload", async () => {
  applyEnv({
    AUTH_EMAIL_PROVIDER: "tmail",
    AUTH_EMAIL_API_KEY: "tmail-secret",
    AUTH_EMAIL_FROM: "info@wheatandstone.ca",
    AUTH_EMAIL_API_BASE_URL: "https://api.tmail.example/api",
    AUTH_EMAIL_TMAIL_IDENTITY_ID: "ws-info",
  });

  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const result = await sendPasswordResetEmail({
    to: "member@example.com",
    resetUrl: "https://wheatandstone.ca/reset-password?token=test-token",
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ status: "sent" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
  });

  assert.equal(result.delivered, true);
  assert.equal(result.provider, "tmail");
  assert.equal(capturedUrl, "https://api.tmail.example/api/messages");
  assert.equal(capturedInit?.method, "POST");
  assert.equal((capturedInit?.headers as Record<string, string>).Authorization, "Bearer tmail-secret");

  const body = JSON.parse(String(capturedInit?.body)) as {
    identity_id: string;
    recipients: string[];
    subject: string;
    action: string;
    tracking_enabled: boolean;
    pixel_enabled: boolean;
  };

  assert.equal(body.identity_id, "ws-info");
  assert.deepEqual(body.recipients, ["member@example.com"]);
  assert.equal(body.subject, PASSWORD_RESET_EMAIL_SUBJECT);
  assert.equal(body.action, "send_live");
  assert.equal(body.tracking_enabled, false);
  assert.equal(body.pixel_enabled, false);
});

test("shouldExposeDebugResetUrl stays disabled in production when email delivery succeeds", () => {
  applyEnv({
    NODE_ENV: "production",
    AUTH_EMAIL_EXPOSE_DEBUG_LINK: "true",
  });

  const result = shouldExposeDebugResetUrl({
    delivered: true,
    provider: "tmail",
  });

  assert.equal(result, false);
});
