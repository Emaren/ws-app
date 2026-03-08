const baseUrl =
  process.env.SAVED_MATCH_AUTOMATION_BASE_URL?.trim() ||
  process.env.INTERNAL_WS_APP_BASE_URL?.trim() ||
  process.env.WS_APP_BASE_URL?.trim() ||
  "http://127.0.0.1:3010";

const automationKey =
  process.env.SAVED_MATCH_AUTOMATION_KEY?.trim() ||
  process.env.FULFILLMENT_AUTOMATION_KEY?.trim() ||
  process.env.SYSTEM_HEALTHCHECK_KEY?.trim() ||
  process.env.HEALTH_CHECK_KEY?.trim() ||
  "";

if (!automationKey) {
  console.error(
    "Missing SAVED_MATCH_AUTOMATION_KEY, FULFILLMENT_AUTOMATION_KEY, or SYSTEM_HEALTHCHECK_KEY.",
  );
  process.exit(1);
}

const response = await fetch(
  `${baseUrl.replace(/\/$/, "")}/api/internal/offers/saved-match/run`,
  {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-saved-match-automation-key": automationKey,
    },
    body: JSON.stringify({}),
  },
);

const result = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error("Saved match automation request failed.", response.status, result);
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
