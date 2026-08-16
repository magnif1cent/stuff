"use client";

import { useState, type ReactNode } from "react";

export function ProfileTabs({ tabs }: { tabs: { key: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap ${
              tab.key === activeTab?.key
                ? "border-red-600 text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab?.content}
    </div>
  );
}
