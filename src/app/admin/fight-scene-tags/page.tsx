import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { AdminFightSceneTags } from "@/components/admin-fight-scene-tags";

export default async function AdminFightSceneTagsPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/");
  }

  const tags = await prisma.fightSceneTag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { fightScenes: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-white">Fight scene tags</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Category tags members pick from when tagging a fight scene (e.g. &ldquo;One vs. Many&rdquo;,
        &ldquo;Weapon Duel&rdquo;). Members can&rsquo;t create new tags &mdash; only assign from this list.
      </p>
      <AdminFightSceneTags initialTags={tags} />
    </div>
  );
}
