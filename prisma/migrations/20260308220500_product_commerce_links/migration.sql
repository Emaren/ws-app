ALTER TABLE "InventoryItem" ADD COLUMN "productId" TEXT;
ALTER TABLE "Offer" ADD COLUMN "productId" TEXT;

CREATE INDEX "InventoryItem_productId_idx" ON "InventoryItem"("productId");
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Offer"
ADD CONSTRAINT "Offer_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
