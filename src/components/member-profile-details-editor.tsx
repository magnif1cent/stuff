"use client";

import { useState } from "react";
import { BIO_MAX_LENGTH, LOCATION_MAX_LENGTH } from "@/lib/profile";

const inputClasses =
  "w-full max-w-xs rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none";

export function MemberProfileDetailsEditor({
  initialBio,
  initialLocation,
  initialWebsiteUrl,
}: {
  initialBio: string | null;
  initialLocation: string | null;
  initialWebsiteUrl: string | null;
}) {
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState(initialBio ?? "");
  const [locationDraft, setLocationDraft] = useState(initialLocation ?? "");
  const [websiteDraft, setWebsiteDraft] = useState(initialWebsiteUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (bioDraft.trim().length > BIO_MAX_LENGTH) return;
    if (locationDraft.trim().length > LOCATION_MAX_LENGTH) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile/details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: bioDraft, location: locationDraft, websiteUrl: websiteDraft }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setBio(body.bio);
    setLocation(body.location);
    setWebsiteUrl(body.websiteUrl);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mb-6 flex flex-col gap-3">
        <div>
          <textarea
            value={bioDraft}
            onChange={(e) => setBioDraft(e.target.value)}
            rows={3}
            placeholder="Tell other members a bit about yourself…"
            className="w-full max-w-xl resize-none rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <span
            className={`text-xs ${bioDraft.trim().length > BIO_MAX_LENGTH ? "text-red-500" : "text-neutral-500"}`}
          >
            {bioDraft.trim().length}/{BIO_MAX_LENGTH}
          </span>
        </div>
        <input
          type="text"
          value={locationDraft}
          onChange={(e) => setLocationDraft(e.target.value)}
          placeholder="Location (optional)"
          maxLength={LOCATION_MAX_LENGTH}
          className={inputClasses}
        />
        <input
          type="url"
          value={websiteDraft}
          onChange={(e) => setWebsiteDraft(e.target.value)}
          placeholder="Website or social link (optional)"
          className={inputClasses}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || bioDraft.trim().length > BIO_MAX_LENGTH || locationDraft.trim().length > LOCATION_MAX_LENGTH}
            className="text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setBioDraft(bio ?? "");
              setLocationDraft(location ?? "");
              setWebsiteDraft(websiteUrl ?? "");
              setEditing(false);
              setError(null);
            }}
            className="text-sm text-neutral-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex flex-col gap-1">
        {bio ? (
          <p className="max-w-xl text-sm whitespace-pre-wrap text-neutral-300">{bio}</p>
        ) : (
          <p className="text-sm text-neutral-500 italic">No bio yet.</p>
        )}
        {location && <p className="text-xs text-neutral-500">{location}</p>}
        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-xs text-red-500 hover:underline"
          >
            {websiteUrl}
          </a>
        )}
      </div>
      <button onClick={() => setEditing(true)} className="shrink-0 text-xs text-neutral-400 hover:text-white">
        Edit
      </button>
    </div>
  );
}
