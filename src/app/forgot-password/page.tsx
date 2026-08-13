import { headers } from "next/headers";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const nonce = (await headers()).get("x-nonce");
  return <ForgotPasswordForm nonce={nonce} />;
}
