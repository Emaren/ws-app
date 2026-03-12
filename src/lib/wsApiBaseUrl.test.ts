import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deriveWsApiBaseUrlFromOrigin,
  resolveWsApiBaseUrl,
} from "./wsApiBaseUrl.shared";

test("deriveWsApiBaseUrlFromOrigin maps public app origins to api subdomains", () => {
  assert.equal(
    deriveWsApiBaseUrlFromOrigin("https://wheatandstone.ca"),
    "https://api.wheatandstone.ca",
  );
});

test("resolveWsApiBaseUrl prefers explicit internal configuration", () => {
  const baseUrl = resolveWsApiBaseUrl({
    NODE_ENV: "production",
    WS_API_BASE_URL: "http://127.0.0.1:3310/",
    NEXTAUTH_URL: "https://wheatandstone.ca",
  });

  assert.equal(baseUrl, "http://127.0.0.1:3310");
});

test("resolveWsApiBaseUrl defaults to loopback in production for public origins", () => {
  const baseUrl = resolveWsApiBaseUrl({
    NODE_ENV: "production",
    NEXTAUTH_URL: "https://wheatandstone.ca",
  });

  assert.equal(baseUrl, "http://127.0.0.1:3310");
});

test("resolveWsApiBaseUrl preserves localhost preview origins in production", () => {
  const baseUrl = resolveWsApiBaseUrl({
    NODE_ENV: "production",
    NEXTAUTH_URL: "http://localhost:3111",
    WS_API_PORT: "3012",
  });

  assert.equal(baseUrl, "http://127.0.0.1:3012");
});
