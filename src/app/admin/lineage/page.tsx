import { prisma } from "@/lib/prisma";
import { AdminLineageBulkImport } from "@/components/admin-lineage-bulk-import";
import { AdminLineageLinkForm } from "@/components/admin-lineage-link-form";
import { AdminLineageTree } from "@/components/admin-lineage-tree";

export default async function AdminLineagePage() {
  const relations = await prisma.lineageRelation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sifu: { select: { id: true, name: true, profilePath: true } },
      student: { select: { id: true, name: true, profilePath: true } },
    },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Sifu Lineage</h1>
      <p className="mb-6 max-w-2xl text-sm text-neutral-400">
        Link actors to the sifus who trained them, and trace how far a lineage goes back. Only actors already in the
        catalog can be linked &mdash; this doesn&rsquo;t create new people, it connects the ones already imported
        from TMDB. A student can have more than one sifu: the first one recorded is treated as primary and sets
        their position in the tree; any others show as a secondary &ldquo;co-sifu&rdquo; link.
      </p>

      <div className="rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-1 text-base font-semibold text-white">Bulk import chains</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Paste one succession chain per line, sifu first. A chain of N names becomes N&minus;1 links &mdash; the
          fast path for entering a whole lineage at once instead of one link at a time.
        </p>
        <AdminLineageBulkImport />
      </div>

      <div className="mt-6 rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-1 text-base font-semibold text-white">Link sifu &rarr; student</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Or add one link by hand &mdash; useful for a single correction.
        </p>
        <AdminLineageLinkForm initialRelations={relations} />
      </div>

      <div className="mt-6 rounded-md border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-1 text-base font-semibold text-white">Lineage tree</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Pick a person to center the tree on. Click any node to re-center on them, or use the buttons under the
          highlighted person to add a link directly.
        </p>
        <AdminLineageTree />
      </div>
    </div>
  );
}
