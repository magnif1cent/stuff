-- CreateIndex
CREATE INDEX "MemberList_updatedAt_idx" ON "MemberList"("updatedAt");

-- CreateIndex
CREATE INDEX "MemberList_name_ilike_trgm_idx" ON "MemberList" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_username_ilike_trgm_idx" ON "User" USING GIN ("username" gin_trgm_ops);
