import { prisma } from "@/lib/prisma";
import { AdminFightSceneMoves } from "@/components/admin-fight-scene-moves";

export default async function AdminFightSceneMovesPage() {
  const moves = await prisma.fightSceneMove.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { fightScenes: true } } },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Fight scene moves</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Named techniques members pick from when tagging a fight scene (e.g. &ldquo;Flying Kick&rdquo;,
        &ldquo;Leg Sweep&rdquo;). Members can&rsquo;t create new moves — only assign from this list.
      </p>
      <AdminFightSceneMoves initialMoves={moves} />
    </div>
  );
}
