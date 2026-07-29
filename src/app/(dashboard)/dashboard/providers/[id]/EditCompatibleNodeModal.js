"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Button, Badge, Input, Modal, Select } from "@/shared/components";
import { formatKeyValueLines } from "@/shared/utils";

export default function EditCompatibleNodeModal({ isOpen, node, systemPrompt = "", systemPromptVars = "", onSave, onClose, isAnthropic }) {
  const [formData, setFormData] = useState({
    name: "",
    prefix: "",
    apiType: "chat",
    baseUrl: "https://api.openai.com/v1",
    headers: "",
    systemPrompt: "",
    systemPromptVars: "",
  });
  const [saving, setSaving] = useState(false);
  const [checkKey, setCheckKey] = useState("");
  const [checkModelId, setCheckModelId] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (node) {
      setFormData({
        name: node.name || "",
        prefix: node.prefix || "",
        apiType: node.apiType || "chat",
        baseUrl: node.baseUrl || (isAnthropic ? "https://api.anthropic.com/v1" : "https://api.openai.com/v1"),
        headers: formatKeyValueLines(node.headers),
        systemPrompt,
        systemPromptVars,
      });
    }
  }, [node, isAnthropic, systemPrompt, systemPromptVars]);

  const apiTypeOptions = [
    { value: "chat", label: "Chat Completions" },
    { value: "responses", label: "Responses API" },
  ];

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.prefix.trim() || !formData.baseUrl.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: formData.name,
        prefix: formData.prefix,
        baseUrl: formData.baseUrl,
        headers: formData.headers,
        systemPrompt: formData.systemPrompt,
        systemPromptVars: formData.systemPromptVars,
      };
      if (!isAnthropic) {
        payload.apiType = formData.apiType;
      }
      await onSave(payload);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/provider-nodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: formData.baseUrl,
          apiKey: checkKey,
          type: isAnthropic ? "anthropic-compatible" : "openai-compatible",
          modelId: checkModelId.trim() || undefined
        }),
      });
      const data = await res.json();
      setValidationResult(data.valid ? "success" : "failed");
    } catch {
      setValidationResult("failed");
    } finally {
      setValidating(false);
    }
  };

  if (!node) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={`Edit ${isAnthropic ? "Anthropic" : "OpenAI"} Compatible`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || !formData.prefix.trim() || !formData.baseUrl.trim() || saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      {/* gap-8 between sections against gap-4 within, so the grouping reads without rules */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={`${isAnthropic ? "Anthropic" : "OpenAI"} Compatible (Prod)`}
          hint="Required. A friendly label for this node."
        />
        <Input
          label="Prefix"
          value={formData.prefix}
          onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
          placeholder={isAnthropic ? "ac-prod" : "oc-prod"}
          hint="Required. Used as the provider prefix for model IDs."
        />
        {!isAnthropic && (
          <Select
            label="API Type"
            options={apiTypeOptions}
            value={formData.apiType}
            onChange={(e) => setFormData({ ...formData, apiType: e.target.value })}
          />
        )}
        <Input
          label="Base URL"
          value={formData.baseUrl}
          onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
          placeholder={isAnthropic ? "https://api.anthropic.com/v1" : "https://api.openai.com/v1"}
          hint={`Use the base URL (ending in /v1) for your ${isAnthropic ? "Anthropic" : "OpenAI"}-compatible API.`}
        />
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Request</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-main" htmlFor="edit-node-headers">Custom Headers</label>
          <textarea
            id="edit-node-headers"
            className="w-full rounded-[10px] border border-border bg-surface-2 p-2 text-sm resize-y text-text-main placeholder-text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 font-mono min-h-[80px]"
            placeholder={"User-Agent: MyClient/1.0\nX-Client-Name: my-client"}
            value={formData.headers}
            onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
          />
          <p className="text-xs text-text-muted">
            One <code>Name: Value</code> per line. Applied last, so these override the defaults
            including <code>Authorization</code>. Values are templates: <code>{"{{ uuid() }}"}</code>.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-main" htmlFor="edit-node-system-prompt">System Prompt</label>
          <textarea
            id="edit-node-system-prompt"
            className="w-full rounded-[10px] border border-border bg-surface-2 p-2 text-sm resize-y text-text-main placeholder-text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 min-h-[140px]"
            placeholder="e.g. Always answer in British English. Prefer tables over prose."
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
          />
          <p className="text-xs text-text-muted">
            Appended to this node&apos;s requests only. Rendered as a Jinja template; wrap a block
            in <code>{"{% raw %}"}</code> to send it unevaluated.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-main" htmlFor="edit-node-system-prompt-vars">Variables</label>
          <textarea
            id="edit-node-system-prompt-vars"
            className="w-full rounded-[10px] border border-border bg-surface-2 p-2 text-sm resize-y text-text-main placeholder-text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 font-mono min-h-[80px]"
            placeholder={"productName: MyClient\ndataFolderName: .myclient\nfeatures.DisableUploads: false"}
            value={formData.systemPromptVars}
            onChange={(e) => setFormData({ ...formData, systemPromptVars: e.target.value })}
          />
          <p className="text-xs text-text-muted">
            One <code>Name: Value</code> per line, read as <code>{"{{ Name }}"}</code>. Dotted names
            nest; <code>true</code>/<code>false</code>/numbers are coerced. Built-ins such as
            <code>model</code> and <code>provider</code> are always available.
          </p>
        </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Test connection</p>
        <div className="flex gap-2">
          <Input
            label="API Key (for Check)"
            type="password"
            value={checkKey}
            onChange={(e) => setCheckKey(e.target.value)}
            className="flex-1"
          />
          <div className="pt-6">
            <Button onClick={handleValidate} disabled={!checkKey || validating || !formData.baseUrl.trim()} variant="secondary">
              {validating ? "Checking..." : "Check"}
            </Button>
          </div>
        </div>
        <Input
          label="Model ID (optional)"
          value={checkModelId}
          onChange={(e) => setCheckModelId(e.target.value)}
          placeholder="e.g. my-model-id"
          hint="If provider lacks /models endpoint, enter a model ID to validate via chat/completions instead."
        />
        {validationResult && (
          <Badge variant={validationResult === "success" ? "success" : "error"}>
            {validationResult === "success" ? "Valid" : "Invalid"}
          </Badge>
        )}
        </div>

        {saveError && (
          <p className="text-xs text-red-500" role="alert">{saveError}</p>
        )}
      </div>
    </Modal>
  );
}

EditCompatibleNodeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  node: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    prefix: PropTypes.string,
    apiType: PropTypes.string,
    baseUrl: PropTypes.string,
    headers: PropTypes.object,
  }),
  systemPrompt: PropTypes.string,
  systemPromptVars: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isAnthropic: PropTypes.bool,
};
