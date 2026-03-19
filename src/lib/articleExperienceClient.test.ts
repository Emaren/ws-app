import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveArticleDisplayExperience,
  sameArticleExperience,
} from "@/lib/articleExperienceClient";

test("resolveArticleDisplayExperience prefers preview overrides first", () => {
  const selection = resolveArticleDisplayExperience({
    server: { edition: "classic", layout: "editorial" },
    storage: { edition: "modern", layout: "gazette" },
    document: { edition: "operator", layout: "atlas" },
    preview: { edition: "rustic", layout: "marketplace" },
  });

  assert.deepEqual(selection, {
    edition: "rustic",
    layout: "marketplace",
  });
});

test("resolveArticleDisplayExperience prefers persisted storage over stale document defaults", () => {
  const selection = resolveArticleDisplayExperience({
    server: { edition: "classic", layout: "editorial" },
    storage: { edition: "modern", layout: "gazette" },
    document: { edition: "classic", layout: "editorial" },
  });

  assert.deepEqual(selection, {
    edition: "modern",
    layout: "gazette",
  });
});

test("sameArticleExperience compares layout and edition together", () => {
  assert.equal(
    sameArticleExperience(
      { edition: "operator", layout: "atlas" },
      { edition: "operator", layout: "atlas" },
    ),
    true,
  );

  assert.equal(
    sameArticleExperience(
      { edition: "operator", layout: "atlas" },
      { edition: "modern", layout: "atlas" },
    ),
    false,
  );
});
