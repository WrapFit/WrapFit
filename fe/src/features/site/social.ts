// Official channels of WrapFit, shown in the footer. The handles are the ones the
// team plans to register (wrapfit.vn); check each link opens the WrapFit page before a public launch.

export interface SocialLink {
  id: "facebook" | "instagram" | "tiktok" | "zalo" | "email";
  label: string;
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/wrapfit.vn" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/wrapfit.vn" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@wrapfit.vn" },
  { id: "zalo", label: "Zalo", href: "https://zalo.me" },
  { id: "email", label: "Email", href: "mailto:contact.wrapfit@gmail.com" },
];
