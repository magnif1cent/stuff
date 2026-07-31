import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { AdminImportSearch } from "@/components/admin-import-search";
import { AdminBulkImport } from "@/components/admin-bulk-import";

export default async function AdminImportPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-white">Import from TMDB</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Search TMDB and import kung fu / martial arts films into the catalog. Requires{" "}
        <code className="rounded bg-neutral-800 px-1">TMDB_API_KEY</code> to be set.
      </p>
      <AdminImportSearch />

      <div className="my-8 border-t border-neutral-800" />

      <AdminBulkImport />
    </div>
  );
}
