// Routing used to derive a compatible node's API type from its id, ignoring the stored
// apiType field entirely. The dashboard let that field be edited, so it could drift: a node
// born as chat could carry a stored value of responses and still route as chat, because
// nothing read it. One such node exists in the wild for every operator who tried the
// control and saw nothing happen.
//
// Making the field authoritative without this pass would silently activate those stale
// values on upgrade and reroute working providers to an endpoint they were never sending to.
// The id is what was genuinely in effect, so reconciling the field to it keeps behaviour
// byte-identical across the upgrade; from here on the field decides and editing it works.

const typeFromId = (id) => (String(id || "").includes("responses") ? "responses" : "chat");

export default {
  // Numbered 3 because databases in the field are already stamped at schemaVersion 2.
  version: 3,
  name: "reconcile-api-type",
  up(db) {
    for (const row of db.all(`SELECT id, data FROM providerNodes WHERE type = 'openai-compatible'`)) {
      const data = JSON.parse(row.data || "{}");
      const inEffect = typeFromId(row.id);
      if (data.apiType === inEffect) continue;
      data.apiType = inEffect;
      db.run(`UPDATE providerNodes SET data = ? WHERE id = ?`, [JSON.stringify(data), row.id]);
    }

    for (const row of db.all(`SELECT id, provider, data FROM providerConnections`)) {
      if (!String(row.provider || "").startsWith("openai-compatible-")) continue;
      const data = JSON.parse(row.data || "{}");
      // providerSpecificData is stored under the compact key "n".
      const specific = data.n || data.providerSpecificData;
      if (!specific) continue;
      const inEffect = typeFromId(row.provider);
      if (specific.apiType === inEffect) continue;
      specific.apiType = inEffect;
      db.run(`UPDATE providerConnections SET data = ? WHERE id = ?`, [JSON.stringify(data), row.id]);
    }
  },
};
