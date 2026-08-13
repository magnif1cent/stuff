import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminAccountSettings } from "@/components/admin-account-settings";

export default async function AdminAccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, passwordHash: true },
  });

  return (
    <div className="max-w-md">
      <h1 className="mb-2 text-2xl font-bold text-white">Account</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Manage your own sign-in credentials. Changing either one signs you out so you can sign back
        in with the new details.
      </p>
      <AdminAccountSettings currentEmail={user?.email ?? ""} hasPassword={!!user?.passwordHash} />
    </div>
  );
}
