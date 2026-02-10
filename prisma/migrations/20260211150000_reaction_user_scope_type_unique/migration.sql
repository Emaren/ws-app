-- Allow one reaction per user/article/scope/type so users can select each article emoji once.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "articleId", "userId", "scope", "type"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "Reaction"
  WHERE "userId" IS NOT NULL
)
DELETE FROM "Reaction" r
USING ranked
WHERE r."id" = ranked."id"
  AND ranked.rn > 1;

DROP INDEX IF EXISTS "Reaction_articleId_userId_scope_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_articleId_userId_scope_type_key"
  ON "Reaction"("articleId", "userId", "scope", "type");

CREATE INDEX IF NOT EXISTS "Reaction_articleId_userId_scope_idx"
  ON "Reaction"("articleId", "userId", "scope");
