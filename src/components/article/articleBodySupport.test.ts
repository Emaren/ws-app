import assert from "node:assert/strict";
import test from "node:test";
import { stripLeadingDuplicateExcerptBlock } from "./articleBodySupport";

test("stripLeadingDuplicateExcerptBlock removes a matching leading excerpt section", () => {
  const html = `
    <h3>Excerpt:</h3>
    <p>All not chocolate milk is created equal. Avalon stands alone.</p>
    <hr>
    <h2>The Chocolate Milk That Ends the Search</h2>
    <p>Body content lives here.</p>
  `;

  const stripped = stripLeadingDuplicateExcerptBlock(
    html,
    "All not chocolate milk is created equal. Avalon stands alone.",
  );

  assert.match(stripped, /The Chocolate Milk That Ends the Search/);
  assert.doesNotMatch(stripped, /Excerpt:/);
});

test("stripLeadingDuplicateExcerptBlock removes a rich-text excerpt paragraph wrapper", () => {
  const html = `
    <p><strong>Excerpt</strong>:<br /><em>All not chocolate milk is created equal. Avalon stands alone.</em></p>
    <hr />
    <p>Body content lives here.</p>
  `;

  const stripped = stripLeadingDuplicateExcerptBlock(
    html,
    "All not chocolate milk is created equal. Avalon stands alone.",
  );

  assert.equal(stripped.trim(), "<p>Body content lives here.</p>");
});

test("stripLeadingDuplicateExcerptBlock removes the live wrapped excerpt block even when punctuation differs", () => {
  const html = `
    <div><p><strong>Excerpt</strong>:<br />Not all chocolate milk is created equal. Avalon’s glass-bottled organic chocolate milk stands alone — rich, real, and proudly Canadian.</p>
    <hr />
    </div>
    <div><h3>The Chocolate Milk That Ends the Search</h3></div>
    <p>Body content lives here.</p>
  `;

  const stripped = stripLeadingDuplicateExcerptBlock(
    html,
    "Not all chocolate milk is created equal. Avalon’s glass-bottled organic chocolate milk stands alone: rich, real, and proudly Canadian.",
  );

  assert.doesNotMatch(stripped, /<strong>Excerpt<\/strong>/);
  assert.match(stripped, /The Chocolate Milk That Ends the Search/);
});

test("stripLeadingDuplicateExcerptBlock keeps authored content when it is not a duplicate", () => {
  const html = `
    <h3>Excerpt:</h3>
    <p>This is different from the structured excerpt and should remain.</p>
    <p>Body content lives here.</p>
  `;

  const stripped = stripLeadingDuplicateExcerptBlock(
    html,
    "All not chocolate milk is created equal. Avalon stands alone.",
  );

  assert.match(stripped, /This is different from the structured excerpt/);
  assert.match(stripped, /Body content lives here/);
});
