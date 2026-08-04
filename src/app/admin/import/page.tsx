import { AdminImportSearch } from "@/components/admin-import-search";
import { AdminBulkImport } from "@/components/admin-bulk-import";

export default function AdminImportPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Import from TMDB</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Search TMDB and import kung fu / martial arts films into the catalog. Requires{" "}
        <code className="rounded bg-neutral-800 px-1">TMDB_API_KEY</code> to be set.
      </p>
      <AdminImportSearch />

      <hr className="my-8 border-neutral-800" />

      <h2 className="mb-2 text-xl font-bold text-white">Bulk upload</h2>
      <AdminBulkImport />
    </div>
  );
}
