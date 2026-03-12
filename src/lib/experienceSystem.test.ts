import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getExperiencePreset,
  normalizeEdition,
  normalizeLayout,
  recommendPresetForSelection,
  resolveExperienceSelection,
} from "./experienceSystem";

test("legacy edition and layout aliases normalize into the new experience system", () => {
  assert.equal(normalizeEdition("v1"), "classic");
  assert.equal(normalizeEdition("v4"), "operator");
  assert.equal(normalizeLayout("field-notes"), "gazette");
  assert.equal(normalizeLayout("signal"), "atlas");
  assert.equal(getExperiencePreset("blue-operator-atlas")?.slug, "midnight-operator-atlas");
});

test("resolveExperienceSelection honors preset combinations", () => {
  const selection = resolveExperienceSelection({
    preset: "midnight-operator-atlas",
  });

  assert.deepEqual(selection, {
    theme: "midnight",
    edition: "operator",
    layout: "atlas",
    preset: "midnight-operator-atlas",
    presetName: "Midnight / Operator / Atlas",
    presetMatched: true,
  });
});

test("resolveExperienceSelection can override a preset with a user-selected theme", () => {
  const selection = resolveExperienceSelection({
    preset: "black-classic-editorial",
    theme: "crimson",
  });

  assert.equal(selection.theme, "crimson");
  assert.equal(selection.edition, "classic");
  assert.equal(selection.layout, "editorial");
  assert.equal(selection.preset, "black-classic-editorial");
  assert.equal(selection.presetMatched, false);
});

test("recommendPresetForSelection biases toward page-compatible presets", () => {
  const preset = recommendPresetForSelection({
    theme: "midnight",
    edition: "operator",
    layout: "marketplace",
    page: "map",
  });

  assert.equal(getExperiencePreset(preset.slug)?.name, "Midnight / Operator / Atlas");
});

test("page defaults keep home and article experiences distinct", () => {
  const home = resolveExperienceSelection({ page: "home" });
  const article = resolveExperienceSelection({ page: "article" });

  assert.equal(home.preset, "walnut-rustic-gazette");
  assert.equal(home.layout, "gazette");
  assert.equal(article.preset, "black-classic-editorial");
  assert.equal(article.layout, "editorial");
});

test("modern editorial remains a valid custom combination even without a dedicated preset", () => {
  const article = resolveExperienceSelection({
    page: "article",
    theme: "black",
    edition: "modern",
    layout: "editorial",
  });

  assert.equal(article.theme, "black");
  assert.equal(article.edition, "modern");
  assert.equal(article.layout, "editorial");
});

test("resolveExperienceSelection preserves an explicit saved preset when custom presets are supplied", () => {
  const selection = resolveExperienceSelection(
    {
      preset: "user-midnight-command",
    },
    {
      customPresets: [
        {
          slug: "user-midnight-command",
          name: "Midnight Command",
          theme: "midnight",
          edition: "operator",
          layout: "atlas",
          status: "saved",
          summary: "Saved operator atlas blend.",
          supportedPages: [
            "home",
            "article",
            "articles",
            "products",
            "offers",
            "map",
            "discover",
            "community",
            "about",
            "account",
          ],
        },
      ],
    },
  );

  assert.equal(selection.theme, "midnight");
  assert.equal(selection.preset, "user-midnight-command");
  assert.equal(selection.presetName, "Midnight Command");
  assert.equal(selection.presetMatched, true);
});
