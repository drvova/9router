"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import Button from "./Button";
import { formatKeyValueLines, parseCurlHeaders, templatiseHeaders } from "@/shared/utils";

/**
 * Fill a Custom Headers field from a captured cURL command.
 *
 * A capture is the only place a client's header set actually exists — the endpoint will
 * not publish it, and a bundled per-vendor list goes stale on the next version bump. The
 * import replaces identifier-shaped values with the variables that regenerate them per
 * request, so the imported set behaves like a live client rather than one frozen snapshot.
 */
export default function CurlHeaderImport({ onImport }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  const handleImport = () => {
    setError(null);
    setSummary(null);
    const { headers, skipped, error: parseError } = parseCurlHeaders(text);
    if (parseError) { setError(parseError); return; }

    const { headers: templated, replaced } = templatiseHeaders(headers);
    onImport(formatKeyValueLines(templated));
    setSummary({
      count: Object.keys(templated).length,
      skipped: skipped || [],
      replaced: Object.entries(replaced).map(([variable, names]) => `${variable} → ${names.join(", ")}`),
    });
    setText("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
      >
        Import from cURL
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-surface-2 p-2">
      <label className="text-xs font-medium text-text-main" htmlFor="curl-import">
        Paste a cURL command from the real client
      </label>
      <textarea
        id="curl-import"
        className="w-full rounded-[10px] border border-border bg-surface p-2 text-xs font-mono resize-y min-h-[100px] text-text-main placeholder-text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
        placeholder={"curl 'https://api.example.com/v1/chat/completions' \\\n  -H 'X-Request-ID: ...' \\\n  -H 'traceparent: 00-...-...-01'"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      {summary && (
        <div className="text-xs text-text-muted">
          <p className="text-green-500">Imported {summary.count} header{summary.count === 1 ? "" : "s"}.</p>
          {summary.replaced.length > 0 && (
            <p className="mt-1">Per-request values: {summary.replaced.join(" · ")}</p>
          )}
          {summary.skipped.length > 0 && (
            <p className="mt-1">Skipped, already handled by this connection: {summary.skipped.join(", ")}</p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleImport} disabled={!text.trim()}>Import</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setText(""); setError(null); setSummary(null); }}>
          Close
        </Button>
      </div>
    </div>
  );
}

CurlHeaderImport.propTypes = {
  onImport: PropTypes.func.isRequired,
};
