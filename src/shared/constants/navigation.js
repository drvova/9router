// Single source of truth for dashboard navigation and page metadata.
// Sidebar renders these entries as links; Header derives the page title,
// description and icon from the same entries, so labels cannot drift apart.
//
// `label` is the sidebar text, `title` overrides it in the page header when the
// longer form reads better, `exact` adds extra paths that match without prefix
// expansion, and `requires` gates the entry on a key from /api/settings.
import { MEDIA_PROVIDER_KINDS } from "./providers";

// Media kinds surfaced in the sidebar. webSearch + webFetch share one page.
const VISIBLE_MEDIA_KINDS = ["embedding", "image", "video", "tts", "stt"];

const mediaKindPage = (kind) => ({
  href: `/dashboard/media-providers/${kind.id}`,
  label: kind.label,
  icon: kind.icon,
  description: `Manage your ${kind.label} providers`,
});

const mediaChildren = [
  ...MEDIA_PROVIDER_KINDS.filter((kind) => VISIBLE_MEDIA_KINDS.includes(kind.id)).map(mediaKindPage),
  { href: "/dashboard/media-providers/web", label: "Web Fetch & Search", icon: "travel_explore", description: "Manage your web fetch and search providers" },
];

// Grouped by user intent rather than by implementation area.
export const NAV_SECTIONS = [
  {
    id: "connect",
    items: [
      { href: "/dashboard/endpoint",       exact: ["/dashboard"], label: "Endpoint & Key",  icon: "api",        description: "API endpoint configuration" },
      { href: "/dashboard/providers",                             label: "Providers",       icon: "dns",        description: "Manage your AI provider connections" },
      { href: "/dashboard/media-providers", children: mediaChildren, label: "Media Providers", icon: "perm_media", description: "Embedding, image, audio and web providers" },
      { href: "/dashboard/combos",                                label: "Combos",          icon: "layers",     description: "Model combos with fallback" },
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    items: [
      { href: "/dashboard/usage",       label: "Usage",         title: "Usage & Analytics", icon: "bar_chart",  description: "Monitor your API usage, token consumption, and request logs" },
      { href: "/dashboard/quota",       label: "Quota Tracker",                             icon: "data_usage", description: "Track and manage your API quota limits" },
      { href: "/dashboard/token-saver", label: "Token Saver",                               icon: "savings",    description: "Compress prompts and outputs to save tokens" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { href: "/dashboard/cli-tools",    label: "CLI Tools",                          icon: "terminal",  description: "Configure CLI tools" },
      { href: "/dashboard/skills",       label: "Skills", title: "Agent Skills",      icon: "extension", description: "Copy a link and paste to your AI to use 9Router — no install needed" },
      { href: "/dashboard/proxy-pools",  label: "Proxy Pools",                        icon: "lan",       description: "Manage your proxy pool configurations" },
      { action: "remote",                label: "9Remote",                            icon: "computer" },
      { href: "https://9english.net/", external: true, label: "9English",           icon: "translate" },
    ],
  },
  {
    id: "debug",
    label: "Debug",
    items: [
      { href: "/dashboard/console-log", label: "Console Log",                                 icon: "monitor",   description: "Live server console output" },
      { href: "/dashboard/translator",  label: "Translator", requires: "enableTranslator",    icon: "translate", description: "Debug translation flow between formats" },
    ],
  },
];

// Pinned below the scrolling nav — standard dashboard convention.
export const NAV_FOOTER_ITEM = { href: "/dashboard/profile", label: "Settings", icon: "settings", description: "Manage your preferences" };

// Routes reachable by deep link but intentionally absent from the sidebar.
const UNLISTED_PAGES = [
  { href: "/dashboard/mitm", title: "MITM Proxy", icon: "security", description: "Intercept CLI tool traffic and route through 9Router" },
  ...MEDIA_PROVIDER_KINDS.filter((kind) => !VISIBLE_MEDIA_KINDS.includes(kind.id)).map(mediaKindPage),
];

const ALL_PAGES = [
  ...NAV_SECTIONS.flatMap((section) =>
    section.items.flatMap((item) => (item.href && !item.external ? [item, ...(item.children || [])] : []))
  ),
  NAV_FOOTER_ITEM,
  ...UNLISTED_PAGES,
];

// Prefix match on a path-segment boundary, so /dashboard/usage does not
// light up for a future /dashboard/usage-details route.
export function isPathActive(pathname, item) {
  if (!pathname || !item?.href) return false;
  if (item.exact?.includes(pathname)) return true;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Longest match wins, so a child page beats its parent section.
export function findNavPage(pathname) {
  return (
    ALL_PAGES.filter((page) => isPathActive(pathname, page)).sort((a, b) => b.href.length - a.href.length)[0] || null
  );
}
