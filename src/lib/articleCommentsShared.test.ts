import assert from "node:assert/strict";
import { test } from "node:test";
import {
  appendPublicArticleComment,
  countPublicArticleComments,
  nestPublicArticleComments,
  type PublicArticleComment,
} from "./articleCommentsShared";

function comment(input: Partial<PublicArticleComment> & Pick<PublicArticleComment, "id" | "body">): PublicArticleComment {
  return {
    id: input.id,
    parentId: input.parentId ?? null,
    authorName: input.authorName ?? "Reader",
    authorKind: input.authorKind ?? "guest",
    body: input.body,
    createdAtISOString: input.createdAtISOString ?? new Date("2026-03-19T00:00:00.000Z").toISOString(),
    createdAtLabel: input.createdAtLabel ?? "2026-03-18 6:00pm MT",
    replies: input.replies ?? [],
  };
}

test("nestPublicArticleComments groups replies under their parent and keeps newest roots first", () => {
  const nested = nestPublicArticleComments([
    comment({ id: "root-older", body: "First root" }),
    comment({ id: "reply-older", parentId: "root-older", body: "Older reply" }),
    comment({ id: "root-newer", body: "Second root" }),
    comment({ id: "reply-newer", parentId: "root-older", body: "Newer reply" }),
  ]);

  assert.equal(nested.length, 2);
  assert.equal(nested[0]?.id, "root-newer");
  assert.equal(nested[1]?.id, "root-older");
  assert.deepEqual(
    nested[1]?.replies.map((reply) => reply.id),
    ["reply-older", "reply-newer"],
  );
});

test("appendPublicArticleComment prepends roots and appends replies beneath their parent", () => {
  const existing = nestPublicArticleComments([
    comment({ id: "root-older", body: "First root" }),
    comment({ id: "reply-older", parentId: "root-older", body: "Older reply" }),
  ]);

  const withRoot = appendPublicArticleComment(
    existing,
    comment({ id: "root-newer", body: "Latest root" }),
  );
  assert.equal(withRoot[0]?.id, "root-newer");

  const withReply = appendPublicArticleComment(
    withRoot,
    comment({ id: "reply-newer", parentId: "root-older", body: "Latest reply" }),
  );
  assert.deepEqual(
    withReply.find((entry) => entry.id === "root-older")?.replies.map((reply) => reply.id),
    ["reply-older", "reply-newer"],
  );
});

test("countPublicArticleComments includes nested replies", () => {
  const total = countPublicArticleComments(
    nestPublicArticleComments([
      comment({ id: "root-older", body: "First root" }),
      comment({ id: "reply-older", parentId: "root-older", body: "Older reply" }),
      comment({ id: "root-newer", body: "Second root" }),
    ]),
  );

  assert.equal(total, 3);
});
