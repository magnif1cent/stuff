import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// /my-lists now lives on your own profile's Lists tab, so existing
// links/bookmarks to this URL still work.
export default async function MyListsRedirectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my-lists");
  }
  redirect(`/members/${session.user.username}?tab=lists`);
}
