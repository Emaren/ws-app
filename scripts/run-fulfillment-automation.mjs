const baseUrl =
  process.env.FULFILLMENT_AUTOMATION_BASE_URL?.trim() ||
  process.env.INTERNAL_WS_APP_BASE_URL?.trim() ||
  process.env.WS_APP_BASE_URL?.trim() ||
  "http://127.0.0.1:3010";

const automationKey =
  process.env.FULFILLMENT_AUTOMATION_KEY?.trim() ||
  process.env.SYSTEM_HEALTHCHECK_KEY?.trim() ||
  process.env.HEALTH_CHECK_KEY?.trim() ||
  "";

const limit = Number.parseInt(process.env.FULFILLMENT_AUTOMATION_LIMIT || "", 10);
const payload = {
  ...(Number.isFinite(limit) ? { limit } : {}),
};

if (!automationKey) {
  console.error("Missing FULFILLMENT_AUTOMATION_KEY or SYSTEM_HEALTHCHECK_KEY.");
  process.exit(1);
}

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/internal/commerce/fulfillment-automation/run`, {
  method: "POST",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-fulfillment-automation-key": automationKey,
  },
  body: JSON.stringify(payload),
});

const result = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error("Fulfillment automation request failed.", response.status, result);
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));

if (result && typeof result === "object" && "failedCount" in result && Number(result.failedCount) > 0) {
  process.exit(1);
}
