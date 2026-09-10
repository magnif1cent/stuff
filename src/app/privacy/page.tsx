import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Kung Fu Sauce",
  description: "What Kung Fu Sauce collects, how it's used, and your choices.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-4 font-serif text-2xl font-bold text-white">Privacy Policy</h1>

      <div className="mb-8 rounded-md border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm leading-relaxed text-amber-200">
        <strong className="font-semibold text-amber-100">Working draft.</strong> This page describes what the Site
        collects and how it&apos;s used today. A self-service way to export or fully delete your account data isn&apos;t
        built yet — until it is, email us via the channel on the{" "}
        <Link href="/about" className="text-amber-100 underline hover:text-white">About page</Link> to request
        either, and we&apos;ll handle it manually. A dedicated legal/privacy contact address is also still being
        set up.
      </div>

      <p className="mb-8 text-sm leading-relaxed text-neutral-300">Last updated: [date to be finalized].</p>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">1. Information we collect</h2>

        <h3 className="mb-1 mt-4 text-sm font-medium text-neutral-100">Account information</h3>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>
            Your email address and password, stored as a bcrypt hash — never in plain text — or, if you sign in
            with Google, the profile information Google provides (name, email, profile image) via OAuth.
          </li>
          <li>Your chosen or auto-generated username.</li>
          <li>Optional profile fields you add yourself: bio, location, a single website/social link.</li>
        </ul>

        <h3 className="mb-1 mt-4 text-sm font-medium text-neutral-100">Content you create</h3>
        <p className="text-sm leading-relaxed text-neutral-300">
          Ratings, reviews, discussion posts, fight-scene submissions, fun facts, tributes, lists, and any movie
          submissions — shown as described in the Terms of Service.
        </p>

        <h3 className="mb-1 mt-4 text-sm font-medium text-neutral-100">Automatically collected information</h3>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>
            Your IP address, used transiently for rate limiting on login, registration, password-reset, and
            content-submission requests, and by our CAPTCHA provider (Cloudflare Turnstile) on registration and
            password-reset to prevent automated abuse.
          </li>
          <li>Basic page-view analytics via Vercel Web Analytics, which is cookieless — it doesn&apos;t track you individually across sites.</li>
          <li>Error diagnostic data (e.g. a stack trace, the page you were on) sent to Sentry when the Site hits an error, to help us fix bugs.</li>
        </ul>

        <h3 className="mb-1 mt-4 text-sm font-medium text-neutral-100">Cookies</h3>
        <p className="text-sm leading-relaxed text-neutral-300">
          A session cookie keeps you signed in. This is strictly necessary for the Site to function and isn&apos;t
          used for tracking or advertising.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">2. How we use information</h2>
        <p className="mb-3 text-sm leading-relaxed text-neutral-300">We use the information above to:</p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>Create and secure your account, and authenticate you;</li>
          <li>Operate the features you use (ratings, lists, discussions, and the rest);</li>
          <li>Send you account-related email — verification links and password-reset links;</li>
          <li>Detect and prevent abuse (rate limiting, CAPTCHA);</li>
          <li>Diagnose and fix errors;</li>
          <li>Measure aggregate Site usage.</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          We don&apos;t sell your personal information, and we don&apos;t use it for targeted advertising.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">3. How information is shared</h2>
        <p className="mb-3 text-sm leading-relaxed text-neutral-300">
          We share information only with the service providers that help us operate the Site, and only as needed
          for the purposes above:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li><span className="text-neutral-100">Database hosting</span> — all account and content data.</li>
          <li><span className="text-neutral-100">Sign-in provider</span> (currently Google) — email, name, and profile image, only if you use Google sign-in.</li>
          <li><span className="text-neutral-100">Email delivery provider</span> (currently Resend) — your email address, to send verification and password-reset email.</li>
          <li><span className="text-neutral-100">Rate-limiting / anti-abuse provider</span> (currently Upstash) — your IP address, transiently, for rate limiting.</li>
          <li><span className="text-neutral-100">CAPTCHA provider</span> (currently Cloudflare Turnstile) — your IP address and browser signals.</li>
          <li><span className="text-neutral-100">Hosting and analytics provider</span> (currently Vercel) — hosting and aggregate page-view analytics.</li>
          <li><span className="text-neutral-100">Error-monitoring provider</span> (currently Sentry) — error context when something breaks, which may include your IP address or account identifiers.</li>
          <li><span className="text-neutral-100">Movie/cast data source</span> (currently TMDB) — no personal data is sent here; we only pull their public movie/cast catalog data.</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          We name the current provider for each category above for transparency, but the underlying commitment is
          to the category and purpose, not to that specific vendor — we may switch providers within a category
          without that being treated as a material change requiring separate notice, so long as the type of data
          shared and the purpose stay the same.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          We may also disclose information if required by law, or to protect the rights, property, or safety of
          the Site, our users, or the public.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">4. Data retention</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          Account and content data is retained while your account is active. Some deleted content (like discussion
          posts) is soft-deleted — blanked and hidden from public view, with the underlying record kept for thread
          integrity rather than immediately purged.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">5. Your rights and choices</h2>
        <p className="mb-3 text-sm leading-relaxed text-neutral-300">
          Depending on your location, you may have the right to access, correct, or delete your personal
          information, or to receive a copy of it.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>Changing your password and signing out of every device are available today from your account settings.</li>
          <li>Editing or deleting your own content (reviews, posts, lists, fight scenes, and the rest) is available today from wherever that content appears.</li>
          <li>
            Full account deletion and data export aren&apos;t self-service yet — email us via the{" "}
            <Link href="/about" className="text-red-400 hover:text-red-300">About page</Link> to request either.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">6. Children&apos;s privacy</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          The Site is not directed to children under 16, and we don&apos;t knowingly collect personal information
          from them. If you believe a child has provided us personal information, contact us via the{" "}
          <Link href="/about" className="text-red-400 hover:text-red-300">About page</Link> and we&apos;ll delete
          it.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">7. Security</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          We use password hashing (bcrypt), encrypted connections (TLS/HTTPS), a nonce-based Content Security
          Policy, and rate limiting on authentication-sensitive endpoints. No method of transmission or storage is
          perfectly secure, and we can&apos;t guarantee absolute security.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">8. Changes to this policy</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          We may update this Privacy Policy from time to time. We&apos;ll post the updated policy with a new
          &ldquo;last updated&rdquo; date.
        </p>
      </section>
    </div>
  );
}
