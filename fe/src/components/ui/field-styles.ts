// No "use client": Server Components can use these class strings too.

/** Text field look: 44 px, 12 px corners, strong border (3.5:1), cobalt focus ring, red border when invalid. */
export const INPUT_BASE =
  "w-full min-w-0 rounded-control border border-line-strong bg-surface-raised text-body-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-muted/80 hover:border-fg/60 focus:border-focus focus:ring-[3px] focus:ring-focus/20 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20";

export const INPUT_SIZES = { sm: "h-control-sm px-3", md: "h-control-lg px-3.5" } as const;
