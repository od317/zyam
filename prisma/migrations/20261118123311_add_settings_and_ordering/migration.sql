-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SiteSettingTranslation" (
    "key" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SiteSettingTranslation_pkey" PRIMARY KEY ("key","language")
);
