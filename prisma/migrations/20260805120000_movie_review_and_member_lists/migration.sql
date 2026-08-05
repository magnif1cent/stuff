-- Movie approval workflow: member-submitted movies start PENDING and are
-- hidden from public discovery until an admin approves them. Existing rows
-- (all admin-imported so far) default to APPROVED, matching current behavior.
ALTER TABLE "Movie" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Movie" ADD COLUMN "submittedById" TEXT;

CREATE INDEX "Movie_status_idx" ON "Movie"("status");

ALTER TABLE "Movie" ADD CONSTRAINT "Movie_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Member-created public lists, separate from the built-in Favorites/Watchlist.
CREATE TABLE "MemberList" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MemberList_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberList_userId_name_key" ON "MemberList"("userId", "name");
CREATE INDEX "MemberList_userId_idx" ON "MemberList"("userId");

ALTER TABLE "MemberList" ADD CONSTRAINT "MemberList_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MemberListEntry" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "movieId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MemberListEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberListEntry_listId_movieId_key" ON "MemberListEntry"("listId", "movieId");
CREATE INDEX "MemberListEntry_listId_idx" ON "MemberListEntry"("listId");

ALTER TABLE "MemberListEntry" ADD CONSTRAINT "MemberListEntry_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "MemberList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberListEntry" ADD CONSTRAINT "MemberListEntry_movieId_fkey"
  FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
