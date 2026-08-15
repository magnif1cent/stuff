import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_CATEGORY_DESCRIPTION_LENGTH, MAX_CATEGORY_NAME_LENGTH, slugify } from "@/lib/forum";

export async function GET() {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categories = await prisma.forumCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { threads: { where: { isDeleted: false } } } } },
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const existing = await prisma.forumCategory.findFirst({ where: { OR: [{ name: trimmedName }, { slug }] } });
  if (existing) {
    return NextResponse.json({ error: "A category with that name already exists." }, { status: 400 });
  }

  const category = await prisma.forumCategory.create({
    data: { name: trimmedName, slug, description: trimmedDescription || null },
  });
  return NextResponse.json({ category: { ...category, _count: { threads: 0 } } });
}
