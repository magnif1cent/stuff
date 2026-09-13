"use client";

import { useState } from "react";
import type { FightSceneStyle, FightStyleGroup } from "@/generated/prisma/client";
import { groupStylesByCategory, compareStylesByGroup } from "@/lib/style-groups";

type GroupItem = Pick<FightStyleGroup, "id" | "name"> & { _count: { styles: number } };
type StyleItem = Pick<FightSceneStyle, "id" | "name"> & {
  _count: { fightScenes: number };
  group: Pick<FightStyleGroup, "id" | "name"> | null;
};

// Stroke-based, 24x24-grid icons matching the app's existing inline-SVG
// convention (see list-item-rows.tsx) rather than a new icon set — just the
// two this component needs, so not worth a shared icon file yet.
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function AdminFightSceneStyles({
  initialStyles,
  initialGroups,
}: {
  initialStyles: StyleItem[];
  initialGroups: GroupItem[];
}) {
  const [styles, setStyles] = useState(initialStyles);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [groups, setGroups] = useState(initialGroups);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/fight-scene-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { style } = await res.json();
    setStyles((prev) => [...prev, { ...style, group: null }].sort(compareStylesByGroup));
    setNewName("");
  }

  function startEdit(style: StyleItem) {
    setEditingId(style.id);
    setEditName(style.name);
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/fight-scene-styles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { style } = await res.json();
    setStyles((prev) => prev.map((s) => (s.id === id ? { ...s, name: style.name } : s)).sort(compareStylesByGroup));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this style? It will be removed from any fight scenes using it.")) return;
    setError(null);
    const res = await fetch(`/api/admin/fight-scene-styles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setStyles((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleChangeGroup(style: StyleItem, groupId: string | null) {
    setError(null);
    const res = await fetch(`/api/admin/fight-scene-styles/${style.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: style.name, groupId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const group = groupId ? (groups.find((g) => g.id === groupId) ?? null) : null;
    setStyles((prev) => prev.map((s) => (s.id === style.id ? { ...s, group } : s)).sort(compareStylesByGroup));
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setSavingGroup(true);
    setGroupError(null);
    const res = await fetch("/api/admin/fight-style-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim() }),
    });
    setSavingGroup(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setGroupError(body.error ?? "Something went wrong.");
      return;
    }
    const { group } = await res.json();
    setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
    setNewGroupName("");
  }

  function startEditGroup(group: GroupItem) {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setGroupError(null);
  }

  async function saveEditGroup(id: string) {
    if (!editGroupName.trim()) return;
    setSavingGroup(true);
    setGroupError(null);
    const res = await fetch(`/api/admin/fight-style-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editGroupName.trim() }),
    });
    setSavingGroup(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setGroupError(body.error ?? "Something went wrong.");
      return;
    }
    const { group } = await res.json();
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, name: group.name } : g)).sort((a, b) => a.name.localeCompare(b.name)),
    );
    setStyles((prev) =>
      prev
        .map((s) => (s.group?.id === id ? { ...s, group: { id, name: group.name } } : s))
        .sort(compareStylesByGroup),
    );
    setEditingGroupId(null);
  }

  async function handleDeleteGroup(id: string) {
    if (!window.confirm("Delete this group? Its styles will become ungrouped, not deleted.")) return;
    setGroupError(null);
    const res = await fetch(`/api/admin/fight-style-groups/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setGroupError(body.error ?? "Something went wrong.");
      return;
    }
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setStyles((prev) => prev.map((s) => (s.group?.id === id ? { ...s, group: null } : s)).sort(compareStylesByGroup));
  }

  const styleBuckets = groupStylesByCategory(styles);

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-neutral-200">Groups</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Optional categories (e.g. &ldquo;Northern&rdquo;, &ldquo;Southern&rdquo;, &ldquo;Internal&rdquo;) to
          cluster styles below, in the member-facing style picker, and on the fight search filter.
        </p>
        <form onSubmit={handleAddGroup} className="mb-3 flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder='New group name, e.g. "Northern"'
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={savingGroup || !newGroupName.trim()}
            className="rounded-md border border-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            Add group
          </button>
        </form>

        {groupError && <p className="mb-3 text-sm text-red-500">{groupError}</p>}

        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li
              key={group.id}
              className="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2"
            >
              {editingGroupId === group.id ? (
                <>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditGroup(group.id)}
                      disabled={savingGroup}
                      className="text-xs text-neutral-300 hover:text-white"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-sm text-neutral-100">{group.name}</span>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span>
                      {group._count.styles} style{group._count.styles === 1 ? "" : "s"}
                    </span>
                    <button
                      onClick={() => startEditGroup(group)}
                      aria-label={`Rename ${group.name}`}
                      title="Rename"
                      className="text-neutral-400 hover:text-white"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      aria-label={`Delete ${group.name}`}
                      title="Delete"
                      className="text-neutral-400 hover:text-red-400"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {groups.length === 0 && <p className="text-sm text-neutral-500">No groups yet — styles are ungrouped.</p>}
        </ul>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-200">Styles</h2>
      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New style name, e.g. "Drunken Boxing"'
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          Add style
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <div className="flex flex-col gap-5">
        {styleBuckets.map((bucket, i) => (
          <div key={bucket.label ?? `ungrouped-${i}`}>
            {styleBuckets.length > 1 && (
              <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                {bucket.label ?? "Ungrouped"}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {bucket.styles.map((style) => (
                <li
                  key={style.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2"
                >
                  {editingId === style.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(style.id)}
                          disabled={saving}
                          className="text-xs text-neutral-300 hover:text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-neutral-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-neutral-100">{style.name}</span>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        <span>
                          {style._count.fightScenes} scene{style._count.fightScenes === 1 ? "" : "s"}
                        </span>
                        <select
                          value={style.group?.id ?? ""}
                          onChange={(e) => handleChangeGroup(style, e.target.value || null)}
                          className="rounded-md border border-neutral-700 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-300 focus:border-red-600 focus:outline-none"
                        >
                          <option value="">No group</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => startEdit(style)}
                          aria-label={`Rename ${style.name}`}
                          title="Rename"
                          className="text-neutral-400 hover:text-white"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(style.id)}
                          aria-label={`Delete ${style.name}`}
                          title="Delete"
                          className="text-neutral-400 hover:text-red-400"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {styles.length === 0 && <p className="text-sm text-neutral-500">No styles yet.</p>}
      </div>
    </div>
  );
}
