-- CreateTable
CREATE TABLE "MemberListLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberListLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberListLike_listId_idx" ON "MemberListLike"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberListLike_userId_listId_key" ON "MemberListLike"("userId", "listId");

-- AddForeignKey
ALTER TABLE "MemberListLike" ADD CONSTRAINT "MemberListLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberListLike" ADD CONSTRAINT "MemberListLike_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MemberList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
