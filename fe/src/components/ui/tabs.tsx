"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/utils/helpers";

/**
 * Tabs (WAI-ARIA tabs pattern): ←/→ (and Home/End) move between tabs and select them, Tab moves into the panel. Each
 * tab names its panel (`aria-controls`, only when a TabPanel for it is mounted) and each panel its tab
 * (`aria-labelledby`). Tabs that filter content elsewhere on the page can go without TabPanel.
 *
 *   <Tabs value={tab} onValueChange={setTab} label="Nguồn mẫu">
 *     <TabList>
 *       <Tab value="curated" count={12}>WrapFit Curated</Tab>
 *       <Tab value="community">Cộng đồng</Tab>
 *     </TabList>
 *     <TabPanel value="curated">…</TabPanel>
 *   </Tabs>
 *
 * Order tabs by how often people need them, the most used first.
 */

interface TabsContextValue {
  value: string;
  select(value: string): void;
  baseId: string;
  variant: "pill" | "segmented" | "underline";
  /** Values whose TabPanel is mounted. */
  panels: ReadonlySet<string>;
  registerPanel(value: string): () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tab, TabList and TabPanel must be inside <Tabs>");
  return context;
}

export interface TabsProps<T extends string> {
  value: T;
  onValueChange(value: T): void;
  /**
   * `pill` grey track with a dark active pill (pack.ly), `segmented` black hairline box (pacdora), `underline` text
   * tabs with a bar under the active one.
   */
  variant?: "pill" | "segmented" | "underline";
  children: React.ReactNode;
  className?: string;
}

export function Tabs<T extends string>({ value, onValueChange, variant = "pill", children, className }: TabsProps<T>) {
  const baseId = useId();
  const [panels, setPanels] = useState<ReadonlySet<string>>(() => new Set());
  const registerPanel = useCallback((panel: string) => {
    setPanels((current) => new Set(current).add(panel));
    return () =>
      setPanels((current) => {
        const next = new Set(current);
        next.delete(panel);
        return next;
      });
  }, []);
  return (
    <TabsContext.Provider value={{ value, select: (next) => onValueChange(next as T), baseId, variant, panels, registerPanel }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

const LIST: Record<TabsContextValue["variant"], string> = {
  pill: "inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-sunken p-1 [scrollbar-width:none]",
  segmented: "inline-flex max-w-full overflow-x-auto rounded-control border border-fg bg-surface-raised p-0.5 [scrollbar-width:none]",
  underline: "flex max-w-full gap-5 overflow-x-auto border-b border-line [scrollbar-width:none]",
};

const TAB: Record<TabsContextValue["variant"], { base: string; active: string; idle: string }> = {
  pill: {
    base: "h-control-sm rounded-full px-4",
    active: "bg-fg text-fg-inverse shadow-soft-8",
    idle: "text-fg-muted hover:bg-surface-raised/70 hover:text-fg",
  },
  segmented: {
    base: "h-control-sm rounded-lg px-3.5",
    active: "bg-fg text-fg-inverse",
    idle: "text-fg hover:bg-surface-sunken",
  },
  underline: {
    base: "-mb-px h-control border-b-2 px-0.5",
    active: "border-fg text-fg",
    idle: "border-transparent text-fg-muted hover:border-line-strong hover:text-fg",
  },
};

export function TabList({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  const { variant } = useTabs();
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? []);
    const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const go = (next: number) => {
      event.preventDefault();
      const tab = tabs[(next + tabs.length) % tabs.length];
      tab.focus();
      tab.click();
    };
    if (event.key === "ArrowRight") go(index + 1);
    else if (event.key === "ArrowLeft") go(index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(tabs.length - 1);
  };

  return (
    <div ref={ref} role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn(LIST[variant], className)}>
      {children}
    </div>
  );
}

export function Tab({
  value,
  icon,
  count,
  disabled,
  children,
  className,
}: {
  value: string;
  icon?: React.ReactNode;
  /** Number of items behind the tab. */
  count?: number;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { value: current, select, baseId, variant, panels } = useTabs();
  const active = current === value;
  const style = TAB[variant];
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={active}
      // Only the active panel is mounted, so only the active tab points at one, and only when it exists.
      aria-controls={active && panels.has(value) ? `${baseId}-panel-${value}` : undefined}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={() => select(value)}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-label outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4",
        style.base,
        active ? style.active : style.idle,
        className,
      )}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span className={cn("rounded-full px-1.5 text-label-sm tabular-nums", active ? "bg-fg-inverse/20" : "bg-surface-sunken text-fg-muted")}>{count}</span>
      )}
    </button>
  );
}

export function TabPanel({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: current, baseId, registerPanel } = useTabs();
  const shown = current === value;
  useEffect(() => (shown ? registerPanel(value) : undefined), [shown, value, registerPanel]);
  if (!shown) return null;
  return (
    <div role="tabpanel" id={`${baseId}-panel-${value}`} aria-labelledby={`${baseId}-tab-${value}`} tabIndex={0} className={cn("rounded-panel outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  );
}
