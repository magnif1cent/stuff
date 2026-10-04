"use client";

import { useState, type ReactNode } from "react";

// `initialTab` comes from the page's `?tab=` param, and switching tabs
// writes it back with replaceState (no new history entry), so a link like
// a list page's "Lists" breadcrumb can land on a specific tab, and the
// browser's back button returns to the tab you left from.
export function ProfileTabs({
  tabs,
  initialTab,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
  initialTab?: string;
}) {
  const [active, setActive] = useState(tabs.find((tab) => tab.key === initialTab)?.key ?? tabs[0]?.key);

  function selectTab(key: string) {
    setActive(key);
    const url = new URL(window.location.href);
    if (key === tabs[0]?.key) url.searchParams.delete("tab");
    else url.searchParams.set("tab", key);
    window.history.replaceState(null, "", url);
  }
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => selectTab(tab.key)}
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
