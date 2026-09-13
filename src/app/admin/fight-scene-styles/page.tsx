import { prisma } from "@/lib/prisma";
import { AdminFightSceneStyles } from "@/components/admin-fight-scene-styles";

export default async function AdminFightSceneStylesPage() {
  const [styles, groups] = await Promise.all([
    prisma.fightSceneStyle.findMany({
      orderBy: [{ group: { name: "asc" } }, { name: "asc" }],
      include: { _count: { select: { fightScenes: true } }, group: { select: { id: true, name: true } } },
    }),
    prisma.fightStyleGroup.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { styles: true } } },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Fight styles</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Martial arts styles members pick from when tagging a fight scene (e.g. &ldquo;Drunken Boxing&rdquo;,
        &ldquo;Muay Thai&rdquo;). Members can&rsquo;t create new styles — only assign from this list. Optionally
        cluster styles into groups (e.g. &ldquo;Northern&rdquo;, &ldquo;Southern&rdquo;, &ldquo;Internal&rdquo;) to
        organize the member-facing style picker and the fight search filter.
      </p>
      <AdminFightSceneStyles initialStyles={styles} initialGroups={groups} />
    </div>
  );
}
