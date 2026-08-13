import { headers } from "next/headers";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const nonce = (await headers()).get("x-nonce");
  return <RegisterForm nonce={nonce} />;
}
