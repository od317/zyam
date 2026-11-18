-- CreateEnum
CREATE TYPE "SpecValueType" AS ENUM ('number', 'text');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "priceMax" DECIMAL(12,2),
ADD COLUMN     "priceMin" DECIMAL(12,2),
ADD COLUMN     "priceMode" "PriceMode" NOT NULL DEFAULT 'on_request';

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategoryTranslation" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSeries" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "ProductSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSeriesTranslation" (
    "id" SERIAL NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ProductSeriesTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "seriesId" INTEGER,
    "priceMode" "PriceMode" NOT NULL DEFAULT 'on_request',
    "priceMin" DECIMAL(12,2),
    "priceMax" DECIMAL(12,2),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "status" "ImageStatus" NOT NULL DEFAULT 'processing',
    "originalKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thumbUrl" TEXT,
    "mediumUrl" TEXT,
    "largeUrl" TEXT,
    "blurDataUrl" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecDefinition" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "unit" TEXT,
    "valueType" "SpecValueType" NOT NULL,

    CONSTRAINT "SpecDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecDefinitionTranslation" (
    "id" SERIAL NOT NULL,
    "definitionId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SpecDefinitionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpec" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "definitionId" INTEGER NOT NULL,
    "numberValue" DECIMAL(12,3),
    "textValue" TEXT,

    CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finish" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "colorHex" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishTranslation" (
    "id" SERIAL NOT NULL,
    "finishId" INTEGER NOT NULL,
    "language" "Language" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "FinishTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishImage" (
    "id" SERIAL NOT NULL,
    "finishId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "status" "ImageStatus" NOT NULL DEFAULT 'processing',
    "originalKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thumbUrl" TEXT,
    "mediumUrl" TEXT,
    "largeUrl" TEXT,
    "blurDataUrl" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFinish" (
    "productId" INTEGER NOT NULL,
    "finishId" INTEGER NOT NULL,

    CONSTRAINT "ProductFinish_pkey" PRIMARY KEY ("productId","finishId")
);

-- CreateTable
CREATE TABLE "ProjectProduct" (
    "projectId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "ProjectProduct_pkey" PRIMARY KEY ("projectId","productId")
);

-- CreateTable
CREATE TABLE "ProjectFinish" (
    "projectId" INTEGER NOT NULL,
    "finishId" INTEGER NOT NULL,

    CONSTRAINT "ProjectFinish_pkey" PRIMARY KEY ("projectId","finishId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategoryTranslation_categoryId_language_key" ON "ProductCategoryTranslation"("categoryId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSeries_slug_key" ON "ProductSeries"("slug");

-- CreateIndex
CREATE INDEX "ProductSeries_categoryId_idx" ON "ProductSeries"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSeriesTranslation_seriesId_language_key" ON "ProductSeriesTranslation"("seriesId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_categoryId_isPublished_idx" ON "Product"("categoryId", "isPublished");

-- CreateIndex
CREATE INDEX "Product_seriesId_idx" ON "Product"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_productId_language_key" ON "ProductTranslation"("productId", "language");

-- CreateIndex
CREATE INDEX "ProductImage_status_createdAt_idx" ON "ProductImage"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_sortOrder_key" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SpecDefinition_key_key" ON "SpecDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SpecDefinitionTranslation_definitionId_language_key" ON "SpecDefinitionTranslation"("definitionId", "language");

-- CreateIndex
CREATE INDEX "ProductSpec_definitionId_numberValue_idx" ON "ProductSpec"("definitionId", "numberValue");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSpec_productId_definitionId_key" ON "ProductSpec"("productId", "definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Finish_slug_key" ON "Finish"("slug");

-- CreateIndex
CREATE INDEX "Finish_isPublished_createdAt_idx" ON "Finish"("isPublished", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinishTranslation_finishId_language_key" ON "FinishTranslation"("finishId", "language");

-- CreateIndex
CREATE INDEX "FinishImage_status_createdAt_idx" ON "FinishImage"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinishImage_finishId_sortOrder_key" ON "FinishImage"("finishId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductFinish_finishId_idx" ON "ProductFinish"("finishId");

-- CreateIndex
CREATE INDEX "ProjectProduct_productId_idx" ON "ProjectProduct"("productId");

-- CreateIndex
CREATE INDEX "ProjectFinish_finishId_idx" ON "ProjectFinish"("finishId");

-- AddForeignKey
ALTER TABLE "ProductCategoryTranslation" ADD CONSTRAINT "ProductCategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSeries" ADD CONSTRAINT "ProductSeries_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSeriesTranslation" ADD CONSTRAINT "ProductSeriesTranslation_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ProductSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ProductSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecDefinitionTranslation" ADD CONSTRAINT "SpecDefinitionTranslation_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "SpecDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "SpecDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishTranslation" ADD CONSTRAINT "FinishTranslation_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "Finish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishImage" ADD CONSTRAINT "FinishImage_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "Finish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFinish" ADD CONSTRAINT "ProductFinish_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFinish" ADD CONSTRAINT "ProductFinish_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "Finish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProduct" ADD CONSTRAINT "ProjectProduct_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProduct" ADD CONSTRAINT "ProjectProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFinish" ADD CONSTRAINT "ProjectFinish_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFinish" ADD CONSTRAINT "ProjectFinish_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "Finish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
