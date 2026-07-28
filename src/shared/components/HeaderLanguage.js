"use client";

import { useState, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getCurrentLocale, onLocaleChange } from "@/i18n/runtime";
import { LOCALE_FLAGS } from "@/shared/constants/locales";
import LanguageSwitcher from "./LanguageSwitcher";
import { HEADER_ACTION_CLASS } from "./headerAction";

const getServerLocale = () => DEFAULT_LOCALE;

export default function HeaderLanguage() {
  const [open, setOpen] = useState(false);
  const locale = useSyncExternalStore(onLocaleChange, getCurrentLocale, getServerLocale);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={HEADER_ACTION_CLASS}
        aria-label="Change language"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Language"
        data-i18n-skip="true"
      >
        {/* The flag is decorative; on its own a screen reader would announce
            the country, not the action. */}
        <span aria-hidden="true" className="text-lg leading-none">{LOCALE_FLAGS[locale] || "🌐"}</span>
      </button>

      <LanguageSwitcher hideTrigger isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
