"use client";

import { useTheme } from "@/shared/hooks/useTheme";
import { cn } from "@/shared/utils/cn";
import { HEADER_ACTION_CLASS } from "./headerAction";

const variants = {
  default: HEADER_ACTION_CLASS,
  card: cn(
    "flex items-center justify-center size-11 rounded-full",
    "bg-surface/60 hover:bg-surface",
    "border border-border",
    "backdrop-blur-md shadow-sm hover:shadow-[var(--shadow-warm)]",
    "text-text-muted hover:text-brand-500",
    "transition-all group"
  ),
};

export default function ThemeToggle({ className, variant = "default" }) {
  const { isDark, toggleTheme } = useTheme();
  const label = `Switch to ${isDark ? "light" : "dark"} mode`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(variants[variant], className)}
      aria-label={label}
      title={label}
    >
      <span
        aria-hidden="true"
        className={cn(
          "material-symbols-outlined text-[20px]",
          variant === "card" && "text-[22px] transition-transform duration-300 group-hover:rotate-12"
        )}
      >
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
