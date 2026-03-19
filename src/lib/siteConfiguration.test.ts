import assert from "node:assert/strict";
import { test } from "node:test";
import {
  listHomePagePresetOptions,
  normalizeDeliveryPaymentConfig,
  normalizeHomePagePresetSlug,
} from "./siteConfiguration";

test("home page preset normalization keeps home-compatible presets only", () => {
  assert.equal(
    normalizeHomePagePresetSlug("black-classic-editorial"),
    "black-classic-editorial",
  );
  assert.equal(
    normalizeHomePagePresetSlug("brown-rustic-gazette"),
    "walnut-rustic-gazette",
  );
  assert.equal(normalizeHomePagePresetSlug("midnight-operator-atlas"), null);
});

test("home page preset options stay focused on viable front-door presets", () => {
  const options = listHomePagePresetOptions();

  assert.ok(options.some((option) => option.value === "black-classic-editorial"));
  assert.ok(options.some((option) => option.value === "walnut-rustic-gazette"));
  assert.ok(!options.some((option) => option.value === "midnight-operator-atlas"));
  assert.equal(
    options.find((option) => option.value === "walnut-rustic-gazette")?.isSystemDefault,
    true,
  );
});

test("delivery payment config keeps only complete payment methods", () => {
  const config = normalizeDeliveryPaymentConfig({
    title: "Hybrid Payment Rail",
    summary: "Pay with fiat or crypto.",
    instructions: "Split balances however you like.",
    methods: [
      {
        id: "stone-main",
        label: "Wheat & Stone Treasury",
        tokenSymbol: "stone",
        network: "TokenChain",
        address: "stone1abc123",
        note: "Primary STONE receiver",
      },
      {
        id: "broken",
        label: "Incomplete",
        tokenSymbol: "WHEAT",
        network: "",
        address: "",
      },
    ],
  });

  assert.equal(config.title, "Hybrid Payment Rail");
  assert.equal(config.methods.length, 1);
  assert.deepEqual(config.methods[0], {
    id: "stone-main",
    label: "Wheat & Stone Treasury",
    tokenSymbol: "STONE",
    network: "TokenChain",
    address: "stone1abc123",
    note: "Primary STONE receiver",
  });
});
