-- CreateTable
CREATE TABLE "ActorSpotlight" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "blurb" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ActorSpotlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActorSpotlight_endedAt_createdAt_idx" ON "ActorSpotlight"("endedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "ActorSpotlight" ADD CONSTRAINT "ActorSpotlight_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorSpotlight" ADD CONSTRAINT "ActorSpotlight_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
