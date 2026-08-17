"use client";

import { useState } from "react";
import { BIO_MAX_LENGTH, LOCATION_MAX_LENGTH, detectSocialPlatform, isValidProfileUrl } from "@/lib/profile";
import { SocialIcon } from "@/components/social-icon";

const inputClasses =
  "w-full max-w-xs rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none";
const labelClasses = "mb-1 block text-xs font-medium text-neutral-400";

export function MemberProfileDetailsEditor({
  initialBio,
  initialLocation,
  initialWebsiteUrl,
}: {
  initialBio: string | null;
  initialLocation: string | null;
  initialWebsiteUrl: string | null;
}) {
  const [saved, setSaved] = useState({
    bio: initialBio ?? "",
    location: initialLocation ?? "",
    websiteUrl: initialWebsiteUrl ?? "",
  });
  const [bio, setBio] = useState(saved.bio);
  const [location, setLocation] = useState(saved.location);
  const [websiteUrl, setWebsiteUrl] = useState(saved.websiteUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = bio !== saved.bio || location !== saved.location || websiteUrl !== saved.websiteUrl;
  const bioTooLong = bio.trim().length > BIO_MAX_LENGTH;
  const locationTooLong = location.trim().length > LOCATION_MAX_LENGTH;
  const detectedPlatform =
    websiteUrl.trim() && isValidProfileUrl(websiteUrl.trim()) ? detectSocialPlatform(websiteUrl.trim()) : null;

  async function save() {
    if (bioTooLong || locationTooLong) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile/details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, location, websiteUrl }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const next = { bio: body.bio ?? "", location: body.location ?? "", websiteUrl: body.websiteUrl ?? "" };
    setSaved(next);
    setBio(next.bio);
    setLocation(next.location);
    setWebsiteUrl(next.websiteUrl);
  }

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div>
        <label htmlFor="profile-bio" className={labelClasses}>
          Bio <span className="text-neutral-600">(optional)</span>
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Tell other members a bit about yourself…"
          className="w-full max-w-xl resize-none rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <span className={`text-xs ${bioTooLong ? "text-red-500" : "text-neutral-500"}`}>
          {bio.trim().length}/{BIO_MAX_LENGTH}
        </span>
      </div>
      <div>
        <label htmlFor="profile-location" className={labelClasses}>
          Location <span className="text-neutral-600">(optional)</span>
        </label>
        <input
          id="profile-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Hong Kong"
          maxLength={LOCATION_MAX_LENGTH}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="profile-website" className={labelClasses}>
          Website or social link <span className="text-neutral-600">(optional)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            id="profile-website"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://instagram.com/you"
            className={inputClasses}
          />
          {detectedPlatform && (
            <span
              title={detectedPlatform.label}
              className="flex items-center gap-1 text-xs text-neutral-500"
            >
              <SocialIcon id={detectedPlatform.id} className="h-3.5 w-3.5" />
              {detectedPlatform.label}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty || bioTooLong || locationTooLong}
          className="self-start text-sm text-red-500 hover:underline disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
