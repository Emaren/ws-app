import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSavedExperiencePresets,
  resolveUserExperienceSnapshot,
} from "./userExperience";

test("parseSavedExperiencePresets accepts renamed theme family values", () => {
  const presets = parseSavedExperiencePresets([
    {
      slug: "user-midnight-atlas",
      name: "Midnight Atlas",
      theme: "midnight",
      layout: "atlas",
      edition: "operator",
      createdAt: "2026-03-12T18:00:00.000Z",
      updatedAt: "2026-03-12T18:00:00.000Z",
    },
    {
      slug: "user-walnut-gazette",
      name: "Walnut Gazette",
      theme: "brown",
      layout: "gazette",
      edition: "rustic",
      createdAt: "2026-03-12T18:00:00.000Z",
      updatedAt: "2026-03-12T18:00:00.000Z",
    },
  ]);

  assert.equal(presets.length, 2);
  assert.equal(presets[0]?.theme, "midnight");
  assert.equal(presets[1]?.theme, "walnut");
});

test("resolveUserExperienceSnapshot keeps a saved preset active when it matches the profile", () => {
  const snapshot = resolveUserExperienceSnapshot({
    activeTheme: "midnight",
    activeSkin: "atlas",
    activeSiteVersion: "operator",
    activePresetSlug: "user-midnight-atlas",
    savedPresets: [
      {
        slug: "user-midnight-atlas",
        name: "Midnight Atlas",
        theme: "midnight",
        layout: "atlas",
        edition: "operator",
        createdAt: "2026-03-12T18:00:00.000Z",
        updatedAt: "2026-03-12T18:00:00.000Z",
      },
    ],
  });

  assert.equal(snapshot.theme, "midnight");
  assert.equal(snapshot.layout, "atlas");
  assert.equal(snapshot.edition, "operator");
  assert.equal(snapshot.preset, "user-midnight-atlas");
  assert.equal(snapshot.activePresetSlug, "user-midnight-atlas");
  assert.equal(snapshot.savedPresets.length, 1);
});
