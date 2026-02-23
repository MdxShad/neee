-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('UNIVERSITY', 'AGENT');

-- CreateTable
CREATE TABLE "Poster" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "courseTag" TEXT,
    "universityTag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Poster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "proofUrl" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "universityLedgerId" TEXT,
    "agentLedgerId" TEXT,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPayment" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "proofUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");
CREATE INDEX "Payment_ledgerId_idx" ON "Payment"("ledgerId");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX "Payment_universityLedgerId_idx" ON "Payment"("universityLedgerId");
CREATE INDEX "Payment_agentLedgerId_idx" ON "Payment"("agentLedgerId");

CREATE INDEX "StudentPayment_admissionId_idx" ON "StudentPayment"("admissionId");
CREATE INDEX "StudentPayment_paidAt_idx" ON "StudentPayment"("paidAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_universityLedgerId_fkey" FOREIGN KEY ("universityLedgerId") REFERENCES "UniversityLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agentLedgerId_fkey" FOREIGN KEY ("agentLedgerId") REFERENCES "AgentLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
