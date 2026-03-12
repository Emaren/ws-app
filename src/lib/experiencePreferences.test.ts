import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultEditionSelection,
  defaultLayoutSelection,
  readExperiencePreviewOverrideFromUrl,
  resolveExperienceSnapshot,
} from "./experiencePreferences";

test("resolveExperienceSnapshot maps legacy values into theme, edition, layout, and preset", () => {
  const snapshot = resolveExperienceSnapshot({
    theme: "gray",
    skin: "field-notes",
    siteVersion: "v4",
  });

  assert.equal(snapshot.theme, "grey");
  assert.equal(snapshot.layout, "gazette");
  assert.equal(snapshot.edition, "operator");
  assert.equal(snapshot.skin, "gazette");
  assert.equal(snapshot.siteVersion, "operator");
  assert.equal(snapshot.preset, "midnight-operator-atlas");
});

test("readExperiencePreviewOverrideFromUrl parses preset preview query state", () => {
  const snapshot = readExperiencePreviewOverrideFromUrl(
    "?ws-preview=1&ws-theme=midnight&ws-edition=operator&ws-layout=atlas&ws-preset=midnight-operator-atlas",
  );

  assert.ok(snapshot);
  assert.equal(snapshot?.theme, "midnight");
  assert.equal(snapshot?.edition, "operator");
  assert.equal(snapshot?.layout, "atlas");
  assert.equal(snapshot?.preset, "midnight-operator-atlas");
});

test("readExperiencePreviewOverrideFromUrl ignores non-preview queries", () => {
  assert.equal(
    readExperiencePreviewOverrideFromUrl("?ws-theme=midnight&ws-layout=atlas"),
    null,
  );
});

test("experience defaults point at the flagship black classic editorial mode", () => {
  assert.equal(defaultEditionSelection(), "classic");
  assert.equal(defaultLayoutSelection(), "editorial");
});
