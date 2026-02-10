-- Add reaction scope so article reactions and product thumbs are tracked independently.
CREATE TYPE "ReactionScope" AS ENUM ('ARTICLE', 'PRODUCT');

ALTER TABLE "Reaction"
  ADD COLUMN "scope" "ReactionScope" NOT NULL DEFAULT 'ARTICLE',
  ADD COLUMN "productSlug" TEXT;

-- Keep only one scoped reaction per signed-in user/article to support toggling.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "articleId", "userId", "scope"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "Reaction"
  WHERE "userId" IS NOT NULL
)
DELETE FROM "Reaction" r
USING ranked
WHERE r."id" = ranked."id"
  AND ranked.rn > 1;

DROP INDEX IF EXISTS "Reaction_articleId_userId_type_key";

CREATE UNIQUE INDEX "Reaction_articleId_userId_scope_key"
  ON "Reaction"("articleId", "userId", "scope");

CREATE INDEX "Reaction_articleId_scope_type_idx"
  ON "Reaction"("articleId", "scope", "type");

CREATE INDEX "Reaction_userId_articleId_scope_idx"
  ON "Reaction"("userId", "articleId", "scope");
