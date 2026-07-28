"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { NAV_SECTIONS, NAV_FOOTER_ITEM, isPathActive } from "@/shared/constants/navigation";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import NineRemotePromoModal from "./NineRemotePromoModal";

// py-2 on mobile keeps rows at a ~40px touch target; desktop stays compact.
const rowClass = (active, depth) =>
  cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 lg:py-1.5 transition-colors duration-300 group",
    depth > 0 && "pl-9",
    active
      ? "bg-primary/10 text-primary"
      : "text-text-muted hover:bg-surface-2 hover:text-text-main"
  );

const iconClass = (active, depth) =>
  cn(
    "material-symbols-outlined",
    depth > 0 ? "text-[16px]" : "text-[18px]",
    active ? "fill-1" : "group-hover:text-primary transition-colors"
  );

function NavLinkRow({ item, pathname, onClose, depth = 0 }) {
  const active = isPathActive(pathname, item);
  return (
    <Link
      href={item.href}
      onClick={onClose}
      aria-current={active ? "page" : undefined}
      className={rowClass(active, depth)}
    >
      <span aria-hidden="true" className={iconClass(active, depth)}>{item.icon}</span>
      <span className={cn("text-sm", depth === 0 && "font-medium")}>{item.label}</span>
    </Link>
  );
}

NavLinkRow.propTypes = {
  item: PropTypes.object.isRequired,
  pathname: PropTypes.string,
  onClose: PropTypes.func,
  depth: PropTypes.number,
};

function NavGroupRow({ item, pathname, onClose }) {
  const active = isPathActive(pathname, item);
  const panelId = `nav-panel-${item.href.replaceAll("/", "-")}`;

  // Open follows the active child by default; an explicit toggle overrides it.
  const [override, setOverride] = useState(null);
  const open = override ?? active;

  return (
    <>
      <button
        type="button"
        onClick={() => setOverride(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className={rowClass(active, 0)}
      >
        <span aria-hidden="true" className={iconClass(active, 0)}>{item.icon}</span>
        <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[14px] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>
      <div id={panelId} hidden={!open} className="space-y-0.5">
        {item.children.map((child) => (
          <NavLinkRow key={child.href} item={child} pathname={pathname} onClose={onClose} depth={1} />
        ))}
      </div>
    </>
  );
}

NavGroupRow.propTypes = {
  item: PropTypes.object.isRequired,
  pathname: PropTypes.string,
  onClose: PropTypes.func,
};

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const [settings, setSettings] = useState({});
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data || {}))
      .catch(() => {});
  }, []);

  // Lazy check for new npm version on mount
  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => { if (data.hasUpdate) setUpdateInfo(data); })
      .catch(() => {});
  }, []);

  // Open manual update panel (no countdown yet — user must click Copy to trigger shutdown)
  const handleUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
  };

  // Triggered by Copy button inside ManualUpdatePanel: copy + countdown + shutdown
  const handleCopyAndShutdown = async () => {
    try { await navigator.clipboard.writeText(INSTALL_CMD); } catch { /* clipboard blocked */ }
    copy(INSTALL_CMD);
    let remaining = UPDATER_CONFIG.shutdownCountdownSec;
    setShutdownCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setShutdownCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        fetch("/api/version/shutdown", { method: "POST" }).catch(() => {});
        setIsDisconnected(true);
      }
    }, 1000);
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
    setShutdownCountdown(0);
  };

  const openRemote = () => {
    onClose?.();
    setShowRemoteModal(true);
  };

  const renderItem = (item) => {
    if (item.action === "remote") {
      return (
        <button key="remote" type="button" onClick={openRemote} className={rowClass(false, 0)}>
          <span aria-hidden="true" className={iconClass(false, 0)}>{item.icon}</span>
          <span className="text-sm font-medium">{item.label}</span>
        </button>
      );
    }
    if (item.children) {
      return <NavGroupRow key={item.href} item={item} pathname={pathname} onClose={onClose} />;
    }
    return <NavLinkRow key={item.href} item={item} pathname={pathname} onClose={onClose} />;
  };

  return (
    <>
      {/* Desktop: transparent over the page ground — the main panel's own border draws the seam,
          so no second hairline here. Mobile keeps the vibrancy since it floats as a drawer. */}
      <aside className="flex w-72 flex-col border-r border-border-subtle bg-vibrancy backdrop-blur-xl transition-colors duration-300 min-h-full lg:border-r-0 lg:bg-transparent lg:backdrop-blur-none">
        {/* Traffic lights */}
        <div className="flex items-center gap-2 px-6 pt-5 pb-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>

        {/* Logo */}
        <div className="px-6 py-4 flex flex-col gap-2">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-[10px] bg-gradient-to-br from-brand-500 to-brand-700 shadow-[var(--shadow-warm)]">
              <span className="material-symbols-outlined text-white text-[20px]">hub</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold tracking-tight text-text-main">
                {APP_CONFIG.name}
              </h1>
              <span className="text-xs text-text-muted">v{APP_CONFIG.version}</span>
            </div>
          </Link>
          {updateInfo && (
            <div className="flex flex-col gap-1.5 rounded p-1 -m-1">
              <span className="text-xs font-semibold text-green-600 dark:text-amber-500">
                ↑ New version available: v{updateInfo.latestVersion}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Update now
                </button>
                <button
                  onClick={() => copy(INSTALL_CMD)}
                  title="Copy install command"
                  className="flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer min-w-0"
                >
                  <code className="block text-[10px] text-green-600/80 dark:text-amber-400/70 font-mono truncate">
                    {copied ? "✓ copied!" : INSTALL_CMD}
                  </code>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Dashboard" className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2 space-y-0.5">
            {NAV_SECTIONS.map((section) => {
              const items = section.items.filter((item) => !item.requires || settings[item.requires]);
              if (items.length === 0) return null;
              return (
                <div key={section.id} className={cn("space-y-0.5", section.label && "pt-3 mt-2")}>
                  {section.label && (
                    <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted/60">
                      {section.label}
                    </p>
                  )}
                  {items.map(renderItem)}
                </div>
              );
            })}
          </div>

          {/* Settings pinned below the scroll area */}
          <div className="border-t border-border-subtle px-4 py-2">
            <NavLinkRow item={NAV_FOOTER_ITEM} pathname={pathname} onClose={onClose} />
          </div>
        </nav>
      </aside>

      {/* Remote Promo Modal */}
      <NineRemotePromoModal isOpen={showRemoteModal} onClose={() => setShowRemoteModal(false)} />

      {/* Update Confirmation Modal */}
      <ConfirmModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleUpdate}
        title="Update 9Router"
        message={`Show install command for v${updateInfo?.latestVersion || ""}? You can copy it and shutdown to install manually.`}
        confirmText="Show Command"
        cancelText="Cancel"
        variant="primary"
      />

      {/* Disconnected / Updating Overlay */}
      {(isDisconnected || isUpdating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          {isUpdating ? (
            <ManualUpdatePanel
              latestVersion={updateInfo?.latestVersion}
              installCmd={INSTALL_CMD}
              copied={copied}
              onCopyAndShutdown={handleCopyAndShutdown}
              onCancel={handleCancelUpdate}
              countdown={shutdownCountdown}
              isDisconnected={isDisconnected}
            />
          ) : (
            <div className="text-center p-8">
              <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 text-red-500 mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px]">power_off</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Server Disconnected</h2>
              <p className="text-text-muted mb-6">The proxy server has been stopped.</p>
              <Button variant="secondary" onClick={() => globalThis.location.reload()}>
                Reload Page
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};

function ManualUpdatePanel({ latestVersion, installCmd, copied, onCopyAndShutdown, onCancel, countdown, isDisconnected }) {
  const isCountingDown = countdown > 0;
  return (
    <div className="w-full max-w-lg rounded-xl bg-neutral-900/95 border border-white/10 p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center size-11 rounded-full bg-amber-500/20 text-amber-400">
          <span className="material-symbols-outlined text-[24px]">content_copy</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Update 9Router{latestVersion ? ` to v${latestVersion}` : ""}</h2>
          <p className="text-xs text-white/60">
            {isDisconnected
              ? "Server stopped. Paste the command into a terminal to install."
              : isCountingDown
                ? `Command copied. Server will stop in ${countdown}s...`
                : "Click the button below to copy the install command and shutdown."}
          </p>
        </div>
      </div>

      <p className="text-sm text-white/80 mb-2">Install command:</p>
      <div className="w-full px-3 py-2 rounded bg-white/5 mb-4">
        <code className="text-xs font-mono text-amber-400 break-all">{installCmd}</code>
      </div>

      <ol className="text-xs text-white/70 space-y-1 list-decimal list-inside mb-4">
        <li>Click <strong>Copy & Shutdown</strong> below.</li>
        <li>Paste the command into your terminal and press Enter.</li>
        <li>Run <code className="px-1 rounded bg-white/10 text-green-400">9router</code> again after install.</li>
      </ol>

      {isDisconnected ? (
        <Button variant="secondary" fullWidth onClick={() => globalThis.location.reload()}>
          Reload Page
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isCountingDown}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth onClick={onCopyAndShutdown} disabled={isCountingDown}>
            {copied ? "✓ Copied — shutting down..." : isCountingDown ? `Shutting down in ${countdown}s` : "Copy & Shutdown"}
          </Button>
        </div>
      )}
    </div>
  );
}

ManualUpdatePanel.propTypes = {
  latestVersion: PropTypes.string,
  installCmd: PropTypes.string.isRequired,
  copied: PropTypes.bool,
  onCopyAndShutdown: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  countdown: PropTypes.number,
  isDisconnected: PropTypes.bool,
};
