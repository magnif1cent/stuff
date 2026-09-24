import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListEditForm } from "@/components/list-edit-form";

export default async function EditListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const session = await auth();

  const list = await prisma.memberList.findUnique({
    where: { id: listId },
    select: { id: true, userId: true, name: true, description: true, isRanked: true },
  });

  // Owner-only, and the same 404 anyone else gets for a private list, so
  // this URL doesn't confirm a list exists either.
  if (!list || list.userId !== session?.user?.id) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href={`/lists/${list.id}`} className="text-sm text-neutral-400 hover:text-white">
        ← Back to list
      </Link>
      <h1 className="mt-1 mb-6 text-2xl font-bold text-white">Edit list</h1>
      <ListEditForm list={list} />
    </div>
  );
}
