import { describe, expect, it } from "vitest";
import { parseCurlHeaders, templatiseHeaders } from "../../src/shared/utils/curlHeaders.js";

const CURL = `curl 'https://example.test/v1/chat/completions' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer SECRET' \\
  -H 'X-Conversation-ID: 4347149a-296a-461d-ae3b-75bb99fd13a8' \\
  -H 'X-Conversation-Request-ID: 399322f4-e47e-4515-8df6-1146f23f5d4b' \\
  -H 'X-Conversation-Message-ID: 2f9d091f2f99e5e79169fcd61b572cff' \\
  -H 'X-Request-ID: 2f9d091f2f99e5e79169fcd61b572cff' \\
  -H 'X-Agent-Intent: craft' \\
  -H 'traceparent: 00-e360d728a757e6117a8d6432ae6a8485-278152453eae27b1-01' \\
  -H 'b3: e360d728a757e6117a8d6432ae6a8485-278152453eae27b1-1' \\
  -H 'X-B3-TraceId: e360d728a757e6117a8d6432ae6a8485' \\
  -H 'X-B3-SpanId: 278152453eae27b1'`;

describe("parseCurlHeaders", () => {
  it("extracts headers across line continuations", () => {
    const { headers, error } = parseCurlHeaders(CURL);
    expect(error).toBeUndefined();
    expect(headers["X-Agent-Intent"]).toBe("craft");
    expect(Object.keys(headers)).toHaveLength(9);
  });

  it("skips transport and auth headers rather than importing them", () => {
    // The connection already supplies the credential; importing it would store it twice.
    const { headers, skipped } = parseCurlHeaders(CURL);
    expect(headers.Authorization).toBeUndefined();
    expect(skipped).toContain("Authorization");
    expect(skipped).toContain("Content-Type");
  });

  it("accepts --header, double quotes and unquoted forms", () => {
    const { headers } = parseCurlHeaders('curl x --header "X-A: 1" -H \'X-B: 2\' -H X-C:3');
    expect(headers).toEqual({ "X-A": "1", "X-B": "2", "X-C": "3" });
  });

  it("reports a paste that is not a cURL command", () => {
    expect(parseCurlHeaders("just some text").error).toMatch(/No -H or --header/);
  });

  it("reports a cURL carrying only skippable headers", () => {
    expect(parseCurlHeaders("curl x -H 'Authorization: Bearer y'").error).toMatch(/no importable headers/);
  });
});

describe("templatiseHeaders", () => {
  const run = () => templatiseHeaders(parseCurlHeaders(CURL).headers);

  it("gives every header sharing a trace id the same variable", () => {
    // Regression: assignment by encounter order handed traceId to the message-id pair and
    // left the real trace id on a fresh-per-call hex(32), so traceparent and X-B3-TraceId
    // would have diverged at runtime.
    const { headers } = run();
    expect(headers.traceparent).toBe("00-{{ traceId }}-{{ spanId }}-01");
    expect(headers["X-B3-TraceId"]).toBe("{{ traceId }}");
    expect(headers.b3).toBe("{{ traceId }}-{{ spanId }}-1");
    expect(headers["X-B3-SpanId"]).toBe("{{ spanId }}");
  });

  it("keeps a separately shared id on its own variable", () => {
    const { headers } = run();
    expect(headers["X-Conversation-Message-ID"]).toBe("{{ requestId }}");
    expect(headers["X-Request-ID"]).toBe("{{ requestId }}");
  });

  it("gives independent uuids independent fresh calls", () => {
    const { headers } = run();
    expect(headers["X-Conversation-ID"]).toBe("{{ uuid() }}");
    expect(headers["X-Conversation-Request-ID"]).toBe("{{ uuid() }}");
  });

  it("leaves non-identifier values literal", () => {
    expect(run().headers["X-Agent-Intent"]).toBe("craft");
  });

  it("reports which headers each variable now covers", () => {
    const { replaced } = run();
    expect(replaced.traceId.sort()).toEqual(["X-B3-TraceId", "b3", "traceparent"]);
    expect(replaced.requestId.sort()).toEqual(["X-Conversation-Message-ID", "X-Request-ID"]);
  });

  it("templatises a b3 header even without a traceparent present", () => {
    const { headers } = templatiseHeaders({ b3: "e360d728a757e6117a8d6432ae6a8485-278152453eae27b1-1" });
    expect(headers.b3).toBe("{{ traceId }}-{{ spanId }}-1");
  });

  it("passes an empty map through", () => {
    expect(templatiseHeaders({}).headers).toEqual({});
  });
});
