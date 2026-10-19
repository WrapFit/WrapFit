import React from "react";

/**
 * React's <ViewTransition>. The App Router runs on the React that Next.js ships: with `experimental.viewTransition`
 * that build exports it as `unstable_ViewTransition`, React 19.3 as `ViewTransition`. Without either (older React,
 * tests) the children render as they are and pages simply swap.
 */
type ViewTransitionProps = React.ComponentProps<typeof React.ViewTransition>;

const exports = React as unknown as Record<string, React.ComponentType<ViewTransitionProps> | undefined>;
const Native = exports.ViewTransition ?? exports.unstable_ViewTransition;

export function ViewTransition(props: ViewTransitionProps) {
  return Native ? <Native {...props} /> : <>{props.children}</>;
}
