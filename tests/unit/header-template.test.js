import { describe, expect, it } from "vitest";
import { templatiseHeaders } from "../../src/shared/utils/headerTemplate.js";

// An observed header set, as it arrives from a real client: ids frozen at capture time.
const OBSERVED = {
  "X-Conversation-ID": "4347149a-296a-461d-ae3b-75bb99fd13a8",
  "X-Conversation-Request-ID": "399322f4-e47e-4515-8df6-1146f23f5d4b",
  "X-Conversation-Message-ID": "2f9d091f2f99e5e79169fcd61b572cff",
  "X-Request-ID": "2f9d091f2f99e5e79169fcd61b572cff",
  "X-Agent-Intent": "craft",
  traceparent: "00-e360d728a757e6117a8d6432ae6a8485-278152453eae27b1-01",
  b3: "e360d728a757e6117a8d6432ae6a8485-278152453eae27b1-1",
  "X-B3-TraceId": "e360d728a757e6117a8d6432ae6a8485",
  "X-B3-SpanId": "278152453eae27b1",
};

describe("templatiseHeaders", () => {
  const run = () => templatiseHeaders(OBSERVED);

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
