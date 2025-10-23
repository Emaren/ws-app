/*
  Adds createdAt/updatedAt to Article with safe backfill for existing rows.
*/

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Recreate Article with timestamp columns (defaults for backfill)
CREATE TABLE "new_Article" (
  "id"          TEXT      NOT NULL PRIMARY KEY,
  "slug"        TEXT      NOT NULL,
  "title"       TEXT      NOT NULL,
  "excerpt"     TEXT,
  "coverUrl"    TEXT,
  "content"     TEXT      NOT NULL,
  "publishedAt" DATETIME,
  "status"      TEXT      NOT NULL DEFAULT 'DRAFT',
  "authorId"    TEXT,
  "likeCount"   INTEGER   NOT NULL DEFAULT 0,
  "wowCount"    INTEGER   NOT NULL DEFAULT 0,
  "hmmCount"    INTEGER   NOT NULL DEFAULT 0,
  "createdAt"   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Article_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data from old table and backfill timestamps for existing rows
INSERT INTO "new_Article" (
  "authorId","content","coverUrl","excerpt","hmmCount","id","likeCount",
  "publishedAt","slug","status","title","wowCount",
  "createdAt","updatedAt"
)
SELECT
  "authorId","content","coverUrl","excerpt","hmmCount","id","likeCount",
  "publishedAt","slug","status","title","wowCount",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Article";

DROP TABLE "Article";
ALTER TABLE "new_Article" RENAME TO "Article";

CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
