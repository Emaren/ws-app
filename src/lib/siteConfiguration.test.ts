import assert from "node:assert/strict";
import { test } from "node:test";
import {
  listHomePagePresetOptions,
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
