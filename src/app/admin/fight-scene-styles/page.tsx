import { prisma } from "@/lib/prisma";
import { AdminFightSceneStyles } from "@/components/admin-fight-scene-styles";

export default async function AdminFightSceneStylesPage() {
  const styles = await prisma.fightSceneStyle.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { fightScenes: true } } },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Fight scene styles</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Martial arts styles members pick from when tagging a fight scene (e.g. &ldquo;Drunken Boxing&rdquo;,
        &ldquo;Muay Thai&rdquo;). Members can&rsquo;t create new styles — only assign from this list.
      </p>
      <AdminFightSceneStyles initialStyles={styles} />
    </div>
  );
}
