import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: name => mocks[name] ?? require(name), ...globals });
  return loaded.exports;
}
function live(ticketId, refresh = async () => {}) {
  let now = 0, nextId = 0, changes, status, removed = 0;
  const tasks = new Map(), events = new Map();
  const addEventListener = (name, fn) => events.set(name, fn);
  const removeEventListener = name => events.delete(name);
  const setTimeout = (fn, delay) => { const id = ++nextId; tasks.set(id, { fn, at: now + delay }); return id; };
  const setInterval = (fn, delay) => { const id = setTimeout(fn, delay); tasks.get(id).interval = delay; return id; };
  const clear = id => tasks.delete(id);
  const document = { visibilityState: "visible", addEventListener, removeEventListener };
  const navigator = { onLine: true };
  const window = { setTimeout, setInterval, clearTimeout: clear, clearInterval: clear, addEventListener, removeEventListener };
  const api = { subscribe(id, onChange, onStatus) { assert.equal(id, ticketId); changes = onChange; status = onStatus; return () => { removed++; }; } };
  const stop = load("lib/support/live-updates.ts", {}, { document, navigator, window }).watchSupportView(api, ticketId, refresh);
  return {
    stop, document, navigator, tasks, events,
    change: () => changes(), connection: ready => status(ready), event: name => events.get(name)?.(), removed: () => removed,
    async tick(ms) {
      const end = now + ms;
      for (;;) {
        const entry = [...tasks].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        const [id, task] = entry; now = task.at;
        if (task.interval) task.at += task.interval; else tasks.delete(id);
        void task.fn();
        for (let i = 0; i < 8; i++) await Promise.resolve();
      }
      now = end;
    },
  };
}

test("Support events refresh immediately, coalesce bursts and retain a quiet connected safety check", async () => {
  let calls = 0;
  const view = live("ticket", async () => { calls++; });
  view.connection(true); view.change(); view.change();
  await view.tick(75); assert.equal(calls, 1);
  view.change(); view.change(); await view.tick(75); assert.equal(calls, 2);
  await view.tick(29849); assert.equal(calls, 2);
  await view.tick(76); assert.equal(calls, 3);
  view.stop();
});
for (const [id, interval] of [["ticket", 5000], [undefined, 10000]])
  test(`Support disconnected ${id ? "thread" : "list"} recovers without manual refresh and pauses in the background`, async () => {
    let calls = 0;
    const view = live(id, async () => { calls++; });
    await view.tick(75); assert.equal(calls, 1);
    await view.tick(interval); assert.equal(calls, 2);
    view.document.visibilityState = "hidden";
    await view.tick(interval * 3); assert.equal(calls, 2);
    view.document.visibilityState = "visible"; view.navigator.onLine = false; view.event("visibilitychange");
    await view.tick(75); assert.equal(calls, 2);
    view.navigator.onLine = true; view.event("online");
    await view.tick(75); assert.equal(calls, 3);
    view.stop(); assert.equal(view.removed(), 1); assert.equal(view.tasks.size, 0); assert.equal(view.events.size, 0);
  });
test("Support updates serialize slow reads, preserve an event received in flight and cancel on unmount", async () => {
  let calls = 0, finish;
  const view = live("ticket", async () => { calls++; if (calls === 1) await new Promise(resolve => { finish = resolve; }); });
  await view.tick(75); view.change(); view.change(); await view.tick(500); assert.equal(calls, 1);
  finish(); for (let i = 0; i < 8; i++) await Promise.resolve();
  await view.tick(75); assert.equal(calls, 2);
  view.change(); view.stop(); await view.tick(30000); assert.equal(calls, 2);
});
test("Support reconnect catches up once and refresh errors do not disable subsequent retries", async () => {
  let calls = 0;
  const view = live("ticket", async () => { calls++; if (calls === 1) throw Error("offline"); });
  await view.tick(75); view.connection(false); await view.tick(5000); assert.equal(calls, 2);
  view.connection(true); view.event("focus"); await view.tick(75); assert.equal(calls, 3); view.stop();
});
test("Support subscription uses authenticated ticket metadata events and removes its channel", () => {
  const events = []; let cancelled = false, authenticated = false, connected;
  const channel = { on(kind, filter, cb) { events.push({ kind, filter, cb }); return this; } };
  const client = { channel: () => channel };
  const api = load("lib/support/realtime.ts", {
    "@/lib/supabase/client": { createClient: () => client },
    "@/lib/chat-realtime": { subscribeChat(c, ch, status) { assert.equal(c, client); assert.equal(ch, channel); authenticated = true; status("SUBSCRIBED"); return () => { cancelled = true; }; } },
  }, { crypto: { randomUUID: () => "unique" } });
  const stop = api.subscribeSupportUpdates("ticket", () => {}, ready => { connected = ready; });
  assert.equal(authenticated, true); assert.equal(connected, true);
  assert.deepEqual(events.map(e => e.filter.event), ["INSERT", "UPDATE"]);
  for (const event of events) { assert.equal(event.filter.table, "support_tickets"); assert.equal(event.filter.filter, "id=eq.ticket"); }
  stop(); assert.equal(cancelled, true);
});
test("Live support reads retain validation and expose only sanitized RPC errors", async () => {
  const calls = [];
  const validation = load("lib/support/validation.ts", { "./types": load("lib/support/types.ts") });
  const api = load("lib/support/client-read.ts", {
    "./validation": validation,
    "@/lib/supabase/client": { createClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { error: { code: "42501", message: "private database details" } }; } }) },
  });
  assert.equal((await api.getSupportLive("bad", false)).error, "invalid");
  assert.equal((await api.markSupportLiveRead("bad", "invalid")).error, "invalid");
  assert.equal(calls.length, 0);
  const id = "80000000-0000-4000-8000-000000000001";
  assert.equal((await api.getSupportLive(id, true)).error, "unauthorized");
  assert.equal(calls[0].args.p_staff, true);
  assert.equal((await api.listSupportLive(false, { query: "q".repeat(200), page: -1 })).error, "unauthorized");
  assert.equal(calls[1].args.p_query.length, 160); assert.equal(calls[1].args.p_page, 1);
});
test("Normal logout revokes only this session and redirects only after a successful sign out", async () => {
  let scope, redirected = false;
  const mocks = {
    "@/lib/supabase/server": { createClient: async () => ({ auth: { signOut: async options => { scope = options.scope; return { error: null }; } } }) },
    "next/navigation": { redirect(path) { assert.equal(path, "/login"); redirected = true; } },
  };
  await load("app/actions/auth.ts", mocks).signOut(); assert.equal(scope, "local"); assert.equal(redirected, true);
  redirected = false;
  mocks["@/lib/supabase/server"].createClient = async () => ({ auth: { signOut: async () => ({ error: { message: "offline" } }) } });
  await assert.rejects(load("app/actions/auth.ts", mocks).signOut(), /offline/); assert.equal(redirected, false);
});
