import { describe, expect, it } from "vitest";
import { BaseExecutor } from "../../open-sse/executors/base.js";
import { DefaultExecutor } from "../../open-sse/executors/default.js";

// A 401/403 used to run refreshWithRetry unconditionally: three attempts sleeping
// 0 + 1000 + 2000ms. For an executor that cannot refresh, every attempt returns the same
// null, so the only effect was three seconds added to a failure.
//
// The guard cannot be `credentials.refreshToken` — github refreshes from an apiKey and
// vertex from a service-account JSON, both without one. And it cannot be "stop on the
// first null", because five executors return null from a catch, where a null means a
// transient failure that a retry may well fix. So the executor answers for itself.
describe("canRefresh", () => {
  it("defaults to true so no executor loses its retries", () => {
    expect(new BaseExecutor("anything").canRefresh()).toBe(true);
  });

  it("is false for a compatible node, which has no refresh grant", () => {
    expect(new DefaultExecutor("openai-compatible-chat-abc123").canRefresh()).toBe(false);
    expect(new DefaultExecutor("anthropic-compatible-xyz").canRefresh()).toBe(false);
  });

  it("keeps refresh for the one DefaultExecutor provider that declares a grant", () => {
    // Only claude, codex and gemini-cli declare oauth.refresh, and the latter two have
    // specialised executors — so claude is the single provider this guard could have
    // regressed. It must still answer true.
    expect(new DefaultExecutor("claude").canRefresh()).toBe(true);
  });

  it("reads as a capability, not as the presence of a token", () => {
    // Same executor, opposite credential shapes, same answer: the decision belongs to
    // the executor's configuration and not to what this particular account happens to hold.
    const exec = new DefaultExecutor("openai-compatible-chat-abc123");
    expect(exec.canRefresh({ refreshToken: "rt_present" })).toBe(false);
    expect(exec.canRefresh({})).toBe(false);
  });
});
