import { headers } from "next/headers";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const nonce = (await headers()).get("x-nonce");
  return <LoginForm callbackUrl={callbackUrl ?? "/"} nonce={nonce} />;
}
