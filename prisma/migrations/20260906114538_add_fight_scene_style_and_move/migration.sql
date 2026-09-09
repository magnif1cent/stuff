-- CreateTable
CREATE TABLE "FightSceneStyle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FightSceneStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FightSceneMove" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FightSceneMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FightSceneToFightSceneStyle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FightSceneToFightSceneStyle_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FightSceneToFightSceneMove" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FightSceneToFightSceneMove_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "FightSceneStyle_name_key" ON "FightSceneStyle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FightSceneMove_name_key" ON "FightSceneMove"("name");

-- CreateIndex
CREATE INDEX "_FightSceneToFightSceneStyle_B_index" ON "_FightSceneToFightSceneStyle"("B");

-- CreateIndex
CREATE INDEX "_FightSceneToFightSceneMove_B_index" ON "_FightSceneToFightSceneMove"("B");

-- AddForeignKey
ALTER TABLE "_FightSceneToFightSceneStyle" ADD CONSTRAINT "_FightSceneToFightSceneStyle_A_fkey" FOREIGN KEY ("A") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FightSceneToFightSceneStyle" ADD CONSTRAINT "_FightSceneToFightSceneStyle_B_fkey" FOREIGN KEY ("B") REFERENCES "FightSceneStyle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FightSceneToFightSceneMove" ADD CONSTRAINT "_FightSceneToFightSceneMove_A_fkey" FOREIGN KEY ("A") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FightSceneToFightSceneMove" ADD CONSTRAINT "_FightSceneToFightSceneMove_B_fkey" FOREIGN KEY ("B") REFERENCES "FightSceneMove"("id") ON DELETE CASCADE ON UPDATE CASCADE;
