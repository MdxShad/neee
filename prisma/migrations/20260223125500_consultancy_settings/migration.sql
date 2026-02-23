-- CreateTable
CREATE TABLE "ConsultancySettings" (
    "id" TEXT NOT NULL,
    "consultancyName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultancySettings_pkey" PRIMARY KEY ("id")
);
