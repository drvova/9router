import { describe, expect, it } from "vitest";
import {
  NAV_SECTIONS,
  NAV_FOOTER_ITEM,
  findNavPage,
  isPathActive,
} from "../../src/shared/constants/navigation.js";

const flatItems = NAV_SECTIONS.flatMap((section) => section.items);

describe("isPathActive", () => {
  const usage = { href: "/dashboard/usage" };

  it("matches the exact path and real child segments", () => {
    expect(isPathActive("/dashboard/usage", usage)).toBe(true);
    expect(isPathActive("/dashboard/usage/detail", usage)).toBe(true);
  });

  it("does not match a sibling that merely shares a string prefix", () => {
    expect(isPathActive("/dashboard/usage-details", usage)).toBe(false);
    expect(isPathActive("/dashboard/providers", { href: "/dashboard/provider" })).toBe(false);
  });

  it("treats the dashboard root as the endpoint page without swallowing siblings", () => {
    const endpoint = flatItems.find((item) => item.href === "/dashboard/endpoint");
    expect(isPathActive("/dashboard", endpoint)).toBe(true);
    expect(isPathActive("/dashboard/providers", endpoint)).toBe(false);
  });
});

describe("findNavPage", () => {
  it("prefers the deepest matching entry", () => {
    expect(findNavPage("/dashboard/media-providers/tts").label).toBe("Text To Speech");
    expect(findNavPage("/dashboard/media-providers/web").label).toBe("Web Fetch & Search");
  });

  it("falls back to the parent section for unlisted child routes", () => {
    expect(findNavPage("/dashboard/providers/new").label).toBe("Providers");
  });

  it("resolves media kinds that are hidden from the sidebar", () => {
    expect(findNavPage("/dashboard/media-providers/music").label).toBe("Music");
  });

  it("returns null for routes with no navigation entry", () => {
    expect(findNavPage("/dashboard/nonexistent")).toBeNull();
  });
});

describe("navigation config", () => {
  it("has no duplicate hrefs across sections", () => {
    const hrefs = [
      ...flatItems.flatMap((item) => (item.href ? [item.href, ...(item.children || []).map((c) => c.href)] : [])),
      NAV_FOOTER_ITEM.href,
    ];
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("gives every entry a label and an icon", () => {
    for (const item of [...flatItems, NAV_FOOTER_ITEM]) {
      expect(item.label, JSON.stringify(item)).toBeTruthy();
      expect(item.icon, JSON.stringify(item)).toBeTruthy();
      for (const child of item.children || []) {
        expect(child.label).toBeTruthy();
        expect(child.icon).toBeTruthy();
      }
    }
  });
});
