import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Kung Fu Sauce",
  description: "The terms that govern your use of Kung Fu Sauce.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-4 font-serif text-2xl font-bold text-white">Terms of Service</h1>

      <div className="mb-8 rounded-md border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm leading-relaxed text-amber-200">
        <strong className="font-semibold text-amber-100">Working draft.</strong> Kung Fu Sauce is preparing for a
        commercial transition, and this page describes current practice as accurately as we can while a few
        details — a dedicated legal contact address, and final entity/jurisdiction details once formally
        incorporated — are still being finalized. Check back as the site formalizes.
      </div>

      <p className="mb-8 text-sm leading-relaxed text-neutral-300">Last updated: [date to be finalized].</p>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">1. Acceptance of these terms</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          Kung Fu Sauce (&ldquo;the Site,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is operated from the State of
          Florida. By creating an account or otherwise using the Site, you agree to these Terms of Service.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">2. Eligibility</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          You must be at least 16 years old to create an account. If you are under the age of majority in your
          jurisdiction, you may only use the Site with the involvement of a parent or guardian.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">3. Accounts</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>
            You may register with an email address and password, or by signing in with Google. You are responsible
            for maintaining the confidentiality of your credentials and for all activity under your account.
          </li>
          <li>
            You choose a public username at registration (or one is generated for you on Google sign-in); it is
            shown publicly on your posts, reviews, and profile, and does not reveal your email address.
          </li>
          <li>
            Rating movies or fight scenes, posting in discussions, submitting content, and creating lists require a
            verified email address.
          </li>
          <li>We may suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">4. User content</h2>
        <p className="mb-3 text-sm leading-relaxed text-neutral-300">
          &ldquo;User Content&rdquo; means anything you submit to the Site — discussion posts and replies,
          movie/fight-scene submissions, ratings, reviews, fun facts, tributes, lists, profile details, and
          anything else you post.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>
            You own your User Content. By posting it, you grant us a worldwide, non-exclusive, royalty-free license
            to host, store, reproduce, display, and distribute it as necessary to operate the Site.
          </li>
          <li>
            You&apos;re responsible for it: you represent that you have the rights to post it, and that it doesn&apos;t
            infringe anyone else&apos;s rights or violate the law or the rules below.
          </li>
          <li>
            We may remove or edit User Content and suspend or terminate accounts that violate these Terms. Some
            content (like discussion posts) is soft-deleted on removal — blanked and hidden from public view, with
            the underlying record kept so a thread doesn&apos;t fall apart when one comment in it is removed.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">5. Acceptable use</h2>
        <p className="mb-3 text-sm leading-relaxed text-neutral-300">You agree not to use the Site to:</p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>Post content that is unlawful, defamatory, harassing, hateful, obscene, or infringes another&apos;s rights;</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation;</li>
          <li>Submit false or misleading movie/fight-scene data, or spam the submission, discussion, rating, or list features;</li>
          <li>Attempt to circumvent rate limiting, CAPTCHA, or other abuse-prevention measures, or scrape the Site at a volume that degrades service for others;</li>
          <li>Upload malicious files or attempt to gain unauthorized access to any account, system, or data;</li>
          <li>Use automated means to create accounts or submit content at scale.</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          See the <Link href="/about" className="text-red-400 hover:text-red-300">About page</Link>&apos;s community
          guidelines for more on how discussion and fight scene submissions are moderated.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">6. Third-party content and services</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          Movie and cast data is sourced from{" "}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-red-400 hover:text-red-300">
            The Movie Database (TMDB)
          </a>
          . This product uses the TMDb API but is not endorsed or certified by TMDb. Fight-scene clips are embedded
          from YouTube and remain subject to YouTube&apos;s own Terms of Service. We also rely on other third-party
          services to operate the Site (see the{" "}
          <Link href="/privacy" className="text-red-400 hover:text-red-300">Privacy Policy</Link>); your use of
          those integrations may be subject to their own terms.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">7. Intellectual property</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          The Site&apos;s design, code, and branding (excluding User Content and third-party data described above)
          are owned by us or our licensors and protected by intellectual property law. You may not copy, modify, or
          create derivative works from the Site itself without permission.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">8. Copyright complaints (DMCA)</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          If you believe content on the Site infringes your copyright, contact us via the channel listed on the{" "}
          <Link href="/about" className="text-red-400 hover:text-red-300">About page</Link>. Your notice should
          identify the copyrighted work, the infringing material and its location, your contact information, a
          good-faith statement, and a statement of accuracy under penalty of perjury. We will respond in accordance
          with the DMCA, including by removing or disabling access to material as appropriate.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">9. Disclaimers</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          The Site and all content are provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind, express or implied. We don&apos;t warrant that the Site will be uninterrupted,
          error-free, or secure, or that movie data, ratings, or User Content are accurate or complete.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">10. Limitation of liability</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          To the maximum extent permitted by law, we will not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or any loss of data, profits, or goodwill, arising from your use of
          the Site.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">11. Termination</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          We may suspend or terminate your access to the Site at any time, with or without cause. You may stop
          using the Site at any time.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">12. Changes to these terms</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          We may update these Terms from time to time. We&apos;ll post the updated Terms with a new
          &ldquo;last updated&rdquo; date; continued use of the Site after changes take effect constitutes
          acceptance.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">13. Governing law</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          These Terms are governed by the laws of the State of Florida, without regard to conflict-of-law
          principles.
        </p>
      </section>
    </div>
  );
}
