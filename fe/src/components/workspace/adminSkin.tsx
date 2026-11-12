"use client";

import { createContext, useContext } from "react";

/**
 * Admin console skin. The admin shell provides `true`; shared workspace pieces (Panel, PanelTitle…) read it and switch
 * to the admin look, so the user workspace keeps its own style untouched.
 *
 * The admin look follows the marketing site (pack.ly style): slate canvas #F1F5F9, white cards with large radius and a
 * soft shadow instead of black hairlines, FPT orange as the single accent, Be Vietnam Pro bold headings.
 */
export const AdminSkinContext = createContext(false);
export const useAdminSkin = () => useContext(AdminSkinContext);

/**
 * True inside the persistent admin frame (app/admin/layout.tsx): header and sidebar stay mounted across navigation, so
 * an admin page's own shell only renders its title row and content.
 */
export const AdminFrameContext = createContext(false);

/** White card of the admin console: 24 px radius, soft ambient shadow, a faint ring for edges on white. */
export const ADMIN_CARD = "rounded-3xl bg-white ring-1 ring-line/50 shadow-[0_1px_2px_rgba(29,41,61,0.04),0_12px_32px_-18px_rgba(29,41,61,0.22)]";
