import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionArticleStatus, derivePublishedAtPatch } from "@/lib/articleLifecycle";

test("staff can republish an archived article directly", () => {
  assert.equal(canTransitionArticleStatus("ARCHIVED", "PUBLISHED", "OWNER", true), true);
  assert.equal(canTransitionArticleStatus("ARCHIVED", "PUBLISHED", "ADMIN", false), true);
  assert.equal(canTransitionArticleStatus("ARCHIVED", "PUBLISHED", "EDITOR", false), true);
});

test("contributors still cannot republish archived articles directly", () => {
  assert.equal(canTransitionArticleStatus("ARCHIVED", "PUBLISHED", "CONTRIBUTOR", true), false);
});

test("republishing archived articles restores publishedAt", () => {
  const republishedAt = derivePublishedAtPatch(null, "PUBLISHED");
  assert.ok(republishedAt instanceof Date);
});
