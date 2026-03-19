-- Add reply threading support to article comments.
ALTER TABLE "Comment"
ADD COLUMN "parentId" TEXT;

ALTER TABLE "Comment"
ADD CONSTRAINT "Comment_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Comment"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "Comment_articleId_createdAt_id_idx"
ON "Comment"("articleId", "createdAt", "id");

CREATE INDEX "Comment_articleId_parentId_createdAt_id_idx"
ON "Comment"("articleId", "parentId", "createdAt", "id");

CREATE INDEX "Comment_parentId_createdAt_id_idx"
ON "Comment"("parentId", "createdAt", "id");
