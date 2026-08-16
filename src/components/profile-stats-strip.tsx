function StatTile({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
      {secondary && <p className="text-xs text-neutral-500">{secondary}</p>}
    </div>
  );
}

export function ProfileStatsStrip({
  memberSince,
  moviesSubmitted,
  moviesApproved,
  fightScenesSubmitted,
  fightScenesVerified,
}: {
  memberSince: Date;
  moviesSubmitted: number;
  moviesApproved: number;
  fightScenesSubmitted: number;
  fightScenesVerified: number;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <StatTile
        label="Member since"
        value={memberSince.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
      />
      <StatTile
        label="Movies submitted"
        value={String(moviesSubmitted)}
        secondary={moviesSubmitted > 0 ? `${moviesApproved} approved` : undefined}
      />
      <StatTile
        label="Fight scenes submitted"
        value={String(fightScenesSubmitted)}
        secondary={fightScenesSubmitted > 0 ? `${fightScenesVerified} verified` : undefined}
      />
    </div>
  );
}
