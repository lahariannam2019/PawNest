-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "emergencyAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reminderJobId" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "weightGrams" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductReview_productId_createdAt_idx" ON "ProductReview"("productId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
