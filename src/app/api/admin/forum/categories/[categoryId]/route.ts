import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_CATEGORY_DESCRIPTION_LENGTH, MAX_CATEGORY_NAME_LENGTH, slugify } from "@/lib/forum";

export async function PATCH(request: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { categoryId } = await params;
  const existing = await prisma.forumCategory.findUnique({ where: { id: categoryId } });
  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  const { name, description } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MAX_CATEGORY_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }
  const trimmedDescription = typeof description === "string" ? description.trim() : "";
  if (trimmedDescription.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `description must be ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const slug = slugify(trimmedName);
  if (!slug) {
    return NextResponse.json({ error: "name must contain at least one letter or number." }, { status: 400 });
  }

  const nameTaken = await prisma.forumCategory.findFirst({
    where: { OR: [{ name: trimmedName }, { slug }], id: { not: categoryId } },
  });
  if (nameTaken) {
    return NextResponse.json({ error: "A category with that name already exists." }, { status: 400 });
  }

  const category = await prisma.forumCategory.update({
    where: { id: categoryId },
    data: { name: trimmedName, slug, description: trimmedDescription || null },
  });
  return NextResponse.json({ category });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { categoryId } = await params;
  const existing = await prisma.forumCategory.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { threads: { where: { isDeleted: false } } } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }
  // Unlike FightSceneTag (which hard-deletes freely — a tag carries no
  // history worth preserving), a forum category can hold real member
  // discussion. Require it to be emptied first rather than letting one
  // click cascade-delete every thread and post in it.
  if (existing._count.threads > 0) {
    return NextResponse.json(
      { error: "Delete or move every thread out of this category first." },
      { status: 400 },
    );
  }

  await prisma.forumCategory.delete({ where: { id: categoryId } });
  return NextResponse.json({ ok: true });
}
