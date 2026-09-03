<!--
DRAFT — NOT LEGAL ADVICE. Written by Claude as a starting point for attorney
review before publication. Bracketed [placeholders] need to be filled in by
the site owner or counsel. Sections marked with a Note flag places where
this draft describes a right or process the current codebase does not yet
implement — those need either an engineering follow-up or softened wording
before this is published. Do not publish or link this from the live site
until a lawyer has reviewed it.
-->

# Privacy Policy

**Effective date:** [DATE]

This Privacy Policy explains what information Kung Fu Sauce ("Site," "we,"
"us"), operated by [LEGAL ENTITY NAME], collects, how we use it, and the
choices you have.

## 1. Information We Collect

**Account information**
- Email address and password (stored as a bcrypt hash, never in plain
  text), or, if you sign in with Google, the profile information Google
  provides (name, email, profile image) via OAuth.
- Your chosen or auto-generated username.
- Optional profile fields you add yourself: bio, location, a single
  website/social link.

**Content you create**
- Ratings, reviews, discussion posts, fight-scene submissions, fun facts,
  tributes, lists, and any movie submissions — all shown as described in
  the Terms of Service.

**Automatically collected information**
- IP address, used transiently for rate limiting login, registration,
  password-reset, and content-submission requests (via Upstash Redis),
  and by our CAPTCHA provider (Cloudflare Turnstile) on registration and
  password-reset to prevent automated abuse.
- Basic page-view analytics via Vercel Web Analytics, which is
  cookieless — it does not use cookies or track you individually across
  sites.
- Error diagnostic data (e.g. stack traces, the page you were on) sent to
  Sentry when the Site encounters an error, to help us fix bugs. [Note:
  confirm whether Sentry's default configuration in this app scrubs
  personal data from error payloads before publishing this clause as
  written — if not, say so here instead.]

**Cookies**
- A session cookie (via Auth.js) to keep you signed in. This is
  strictly necessary for the Site to function and is not used for
  tracking or advertising.
- [If a consent banner and non-essential/advertising cookies are added
  later, this section needs to expand accordingly, and a cookie-consent
  mechanism needs to be implemented before those cookies are set for
  visitors in jurisdictions that require prior consent (e.g. EU/UK).]

## 2. How We Use Information

We use the information above to:

- Create and secure your account, and authenticate you;
- Operate the features you use (ratings, lists, discussions, etc.);
- Send you account-related email (verification links, password-reset
  links) via Resend, our email provider — [confirm marketing email is or
  isn't in scope; the current app only sends transactional email];
- Detect and prevent abuse (rate limiting, CAPTCHA);
- Diagnose and fix errors (Sentry);
- Measure aggregate Site usage (Vercel Web Analytics).

We do not sell your personal information, and we do not use it for
targeted advertising.

## 3. How Information Is Shared

We share information only with the service providers ("processors") that
help us operate the Site, and only as needed for the purposes above:

| Provider | Purpose | Data involved |
|---|---|---|
| [Postgres host — Neon/Supabase/Vercel Postgres] | Primary database | All account and content data |
| Google | OAuth sign-in | Email, name, profile image (only if you use Google sign-in) |
| Resend | Transactional email | Email address |
| Upstash | Rate limiting | IP address, transiently |
| Cloudflare (Turnstile) | CAPTCHA | IP address, browser signals |
| Vercel Blob | Admin-uploaded poster images | (Admin-only use; not member personal data) |
| Vercel | Hosting, Web Analytics | Aggregate page-view data |
| Sentry | Error monitoring | Error context, which may include IP address or account identifiers |
| TMDB | Movie/cast data source | No personal data is sent to TMDB — this is one-directional (we pull their public catalog data) |

[Note: list the actual hosting providers/regions in use once finalized —
this table is written generically from the codebase's `.env.example`
and needs the real vendor names and, for GDPR purposes, whether each is
US-based (relevant to the international-transfer section below).]

We may also disclose information if required by law, or to protect the
rights, property, or safety of the Company, our users, or the public.

## 4. Data Retention

- Account and content data is retained while your account is active.
- Some deleted content (e.g. discussion posts) is "soft-deleted" —
  blanked and hidden from public view, but the underlying record may be
  retained for thread integrity or moderation history rather than
  immediately purged.
- [Note: define a concrete retention period and a hard-delete process for
  closed accounts before publishing this section — see Section 5 below,
  which currently describes a right the app cannot yet fully self-serve.]

## 5. Your Rights and Choices

Depending on your location, you may have the right to access, correct, or
delete your personal information, or to receive a copy of it in a portable
format.

- **Password changes** and **signing out of every device** are available
  today from your account settings.
- **Editing or deleting your own content** (reviews, posts, lists, fight
  scenes, etc.) is available today from wherever that content appears.
- **Full account deletion and data export** — [Note: as of this draft,
  the app has no self-service "export my data" or "delete my account"
  flow; account deletion is not itself implemented. Before publishing
  this Privacy Policy, either (a) build that self-service flow, or (b)
  change this section to describe a manual process — e.g. "email
  [CONTACT EMAIL] to request deletion or export, and we will fulfill the
  request within [X] days." Publishing a promise the product can't yet
  fulfill is a real compliance risk, not just a documentation gap.]

To exercise any of these rights, contact us at [CONTACT EMAIL].

## 6. Children's Privacy

The Site is not directed to children under [13/16] and we do not knowingly
collect personal information from them. If you believe a child has
provided us personal information, contact us at [CONTACT EMAIL] and we
will delete it.

## 7. International Data Transfers

[Note: fill in once hosting regions are confirmed.] If our service
providers process data outside your country of residence (for example, in
the United States), we rely on [appropriate safeguards — e.g. standard
contractual clauses, or the providers' own certifications] to protect it.

## 8. Security

We use industry-standard measures to protect your information, including
password hashing (bcrypt), encrypted connections (TLS/HTTPS), a
nonce-based Content Security Policy, and rate limiting on
authentication-sensitive endpoints. No method of transmission or storage
is perfectly secure, and we cannot guarantee absolute security.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. We will post the
updated policy with a new effective date, and, for material changes,
provide additional notice (e.g. a banner on the Site or an email) where
required by law.

## 10. Contact

Questions about this Privacy Policy, or to exercise your rights: [CONTACT
EMAIL].
