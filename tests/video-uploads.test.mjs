import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL("../" + file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const m = { exports: {} };
  vm.runInNewContext(code, {
    module: m,
    exports: m.exports,
    require: (n) => mocks[n] ?? require(n),
    Response,
    Request,
    Headers,
    URL,
    TextDecoder,
    AbortSignal,
      AbortController,
    ReadableStream,
    Uint8Array,
    btoa,
    console: { error() {} },
    ...globals,
  });
  return m.exports;
}
const policy = load("lib/video-upload-policy.ts");
const course = "a1000000-0000-4000-8000-000000000001",
  id = "a2000000-0000-4000-8000-000000000001",
  video = "a3000000-0000-4000-8000-000000000001";
function harness(options = {}) {
  const row = {
    id,
    course_id: course,
    provider: "bunny",
    expected_bytes: 4,
    mime_type: "video/mp4",
    state: "reserved",
    provider_upload_id: video,
    provider_asset_id: video,
    provider_playback_id: null,
    library_id: "library",
    upload_url: null,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 5000).toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    ...options.row,
  };
  const calls = [],
    writes = [];
  let clients = 0,
    reservations = 0;
  function builder() {
    const filters = [];
    let payload;
    const q = {
      select() {
        return q;
      },
      eq(k, v) {
        filters.push([k, v]);
        return q;
      },
      update(p) {
        payload = p;
        return q;
      },
      async maybeSingle() {
        return execute();
      },
      then(ok, bad) {
        return execute().then(ok, bad);
      },
    };
    async function execute() {
      if (options.storageError)
        return { data: null, error: { message: "offline" } };
      if (filters.some(([k, v]) => row[k] !== v))
        return { data: null, error: null };
      if (payload) {
        if (options.writeError)
          return { data: null, error: { message: "offline" } };
        writes.push({ ...payload });
        Object.assign(row, payload);
      }
      return { data: { ...row }, error: null };
    }
    return q;
  }
  const admin = {
    from() {
      return builder();
    },
    async rpc(name) {
      if (name === "claim_lesson_video_upload") {
        if (row.state !== "reserved" || Date.parse(row.expires_at) < Date.now())
          return { data: null, error: { message: "unavailable" } };
        row.state = "uploading";
        return { data: { ...row }, error: null };
      }
      if (name === "claim_stale_video_upload") {
        if (options.linked) return { data: null, error: { message: "linked" } };
        row.state = "deleting";
        return { data: { ...row }, error: null };
      }
      if (name === "cancel_lesson_video_upload") {
        if (options.linked) return { data: null, error: { message: "linked" } };
        row.state = "cancelled";
        return { data: true, error: null };
      }
      throw new Error(name);
    },
  };
  const api = load(
    "lib/video-uploads.ts",
    {
      "@/lib/video-upload-policy": policy,
      "@/lib/auth/can-manage-course": {
        canManageCourse: async () => options.allowed !== false,
      },
      "@/lib/supabase/server": {
        createClient: async () => {
          clients++;
          return {
            rpc: async () => {
              reservations++;
              return options.quota
                ? { data: null, error: { message: options.quota } }
                : { data: id, error: null };
            },
          };
        },
      },
      "@/lib/supabase/admin": {
        createAdminClient: () => {
          clients++;
          return admin;
        },
      },
    },
    {
      process: {
        env: {
          BUNNY_API_KEY: "test-only",
          BUNNY_LIBRARY_ID: "library",
          MUX_TOKEN_ID: "test-only",
          MUX_TOKEN_SECRET: "test-only",
        },
      },
      fetch: async (url, init = {}) => {
        calls.push({ url, init });
        if (options.fetch) return options.fetch(url, init, row);
        if (init.body instanceof ReadableStream) {
          await new Response(init.body).arrayBuffer();
          return new Response(null, { status: 200 });
        }
        return Response.json({ guid: video, status: options.bunnyStatus ?? 4 });
      },
    },
  );
  const prepare = (
    body = { courseId: course, size: 4, type: "video/mp4" },
    provider = "bunny",
  ) =>
    api.prepareVideoUpload(
      new Request("https://test.invalid/api/" + provider + "/upload", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      provider,
    );
  const send = (
    bytes = new Uint8Array(4),
    headers = { "content-type": "video/mp4" },
  ) =>
    api.sendVideoUpload(
      new Request(
        "https://test.invalid/api/video-uploads/" + id + "?courseId=" + course,
        { method: "PUT", headers, body: bytes },
      ),
      id,
      course,
    );
  return {
    api,
    row,
    calls,
    writes,
    prepare,
    send,
    counts: () => ({ clients, reservations }),
  };
}
for (const [name, size, type, code] of [
  ["empty", 0, "video/mp4", "UPLOAD_EMPTY"],
  ["oversized", policy.MAX_VIDEO_BYTES + 1, "video/mp4", "UPLOAD_TOO_LARGE"],
  ["nonvideo", 4, "text/html", "UPLOAD_NOT_VIDEO"],
]) {
  test(`Upload ${name} metadata is rejected before database reservations or provider calls`, async () => {
    const h = harness();
    const r = await h.prepare({ courseId: course, size, type });
    assert.equal((await r.json()).code, code);
    assert.equal(h.calls.length, 0);
    assert.equal(h.counts().reservations, 0);
  });
}
test("Non-object metadata is a client error and never creates a resource", async () => {
  const h = harness();
  const r = await h.prepare(null);
  assert.equal(r.status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal(h.counts().reservations, 0);
});
test("An unauthorized user cannot reserve, upload, inspect or cancel a video", async () => {
  const h = harness({ allowed: false });
  for (const r of [
    await h.prepare(),
    await h.send(),
    await h.api.videoUploadStatus(id, course),
    await h.api.cancelVideoUpload(id, course),
  ])
    assert.equal(r.status, 403);
  assert.equal(h.calls.length, 0);
  assert.equal(h.counts().clients, 0);
});
for (const code of [
  "UPLOAD_DAILY_LIMIT",
  "UPLOAD_ACTIVE_LIMIT",
  "UPLOAD_COURSE_LIMIT",
])
  test(`${code} never creates a provider object`, async () => {
    const h = harness({ quota: code });
    const r = await h.prepare();
    assert.equal(r.status, 429);
    assert.equal((await r.json()).code, code);
    assert.equal(h.calls.length, 0);
  });
test("Preparation returns a private reservation endpoint and never provider credentials or direct upload URL", async () => {
  const h = harness({
    row: { provider: "mux", provider_upload_id: null, provider_asset_id: null },
    fetch: async () =>
      Response.json({
        data: {
          id: "mux-upload",
          url: "https://storage.googleapis.com/test-only?signature=private",
        },
      }),
  });
  const r = await h.prepare(undefined, "mux"),
    data = await r.json();
  assert.equal(r.status, 200);
  assert.equal(data.uploadId, id);
  assert.match(data.uploadUrl, /^\/api\/video-uploads\//);
  assert.doesNotMatch(
    JSON.stringify(data),
    /signature|test-only|storage.googleapis|provider_asset/,
  );
});
test("Failed ownership persistence compensates the just-created Bunny object and never issues a target", async () => {
  const h = harness({ writeError: true });
  const r = await h.prepare();
  assert.equal(r.status, 500);
  assert.equal((await r.json()).uploadId, undefined);
  assert.deepEqual(
    h.calls.map((c) => c.init.method),
    ["POST", "DELETE"],
  );
});
test("Mux upload targets outside its known HTTPS storage hosts are rejected and cancelled", async () => {
  const h = harness({
    row: { provider: "mux" },
    fetch: async () =>
      Response.json({
        data: { id: "known-new-upload", url: "http://127.0.0.1/private" },
      }),
  });
  const r = await h.prepare(undefined, "mux");
  assert.equal(r.status, 502);
  assert.equal(h.calls.length, 2);
  assert.match(h.calls[1].url, /\/cancel$/);
});
test("Foreign-course and unregistered reservations fail without contacting a provider", async () => {
  const h = harness({
    row: { course_id: "a1000000-0000-4000-8000-000000000002" },
  });
  assert.equal((await h.send()).status, 404);
  assert.equal(h.calls.length, 0);
  const missing = harness({ storageError: true });
  assert.equal((await missing.send()).status, 500);
  assert.equal(missing.calls.length, 0);
});
test("Header size mismatches are rejected before provider requests", async () => {
  const h = harness();
  assert.equal(
    (
      await h.send(new Uint8Array(4), {
        "content-type": "video/mp4",
        "content-length": "20",
      })
    ).status,
    400,
  );
  assert.equal(h.calls.length, 0);
});
test("Actual streaming bytes are bounded even without Content-Length; short files also fail", async () => {
  for (const [size, status] of [
    [8, 413],
    [2, 400],
  ]) {
    const h = harness();
    const r = await h.send(new Uint8Array(size));
    assert.equal(r.status, status);
    assert.equal(h.row.state, "failed");
  }
});
test("A successful transfer enters processing, cannot be replayed, and has not replaced lesson IDs", async () => {
  const h = harness();
  assert.equal((await h.send()).status, 200);
  assert.equal(h.row.state, "processing");
  assert.equal((await h.send()).status, 409);
  assert.equal(h.calls.length, 1);
});
for (const [status, ready, state] of [
  [3, false, "processing"],
  [4, true, "ready"],
  [5, false, "failed"],
  [6, false, "failed"],
])
  test(`Bunny provider status ${status} has truthful readiness`, async () => {
    const h = harness({ row: { state: "processing" }, bunnyStatus: status });
    const r = await h.api.videoUploadStatus(id, course);
    assert.equal(h.row.state, state);
    const data = await r.json();
    assert.equal(data.ready ?? false, ready);
  });
test("A premature provider success cannot mark a partially consumed transfer as processing", async () => {
  const h = harness({ fetch: async () => new Response(null, { status: 200 }) });
  const r = await h.send();
  assert.equal(r.status, 400);
  assert.equal(h.row.state, "failed");
});
test("Cached readiness does not poll the provider again", async () => {
  const h = harness({ row: { state: "ready" } });
  const r = await h.api.videoUploadStatus(id, course);
  assert.equal((await r.json()).ready, true);
  assert.equal(h.calls.length, 0);
});
test("Mux only accepts its exact course binding and signed playback ID", async () => {
  const h = harness({
    row: { provider: "mux", state: "processing" },
    fetch: async () =>
      Response.json({
        data: {
          status: "asset_created",
          asset_id: "asset",
          new_asset_settings: { passthrough: "other-course" },
        },
      }),
  });
  assert.equal((await h.api.videoUploadStatus(id, course)).status, 403);
  const signed = harness({
    row: { provider: "mux", state: "processing" },
    fetch: async (url) =>
      Response.json({
        data: url.includes("/uploads/")
          ? {
              status: "asset_created",
              asset_id: "asset",
              new_asset_settings: { passthrough: course },
            }
          : {
              id: "asset",
              status: "ready",
              playback_ids: [{ id: "public-playback", policy: "public" }],
            },
      }),
  });
  assert.equal(
    (await (await signed.api.videoUploadStatus(id, course)).json()).ready,
    false,
  );
  assert.equal(signed.row.state, "processing");
});
test("Cancellation stops an unlinked attempt without racing a remote DELETE against PUT", async () => {
  const h = harness({ row: { state: "uploading" } });
  assert.equal((await h.api.cancelVideoUpload(id, course)).status, 200);
  assert.equal(h.row.state, "cancelled");
  assert.equal(h.calls.length, 0);
  assert.equal((await h.api.videoUploadStatus(id, course)).status, 409);
});
test("A linked video cannot be cancelled or cleaned up, and a fresh upload cannot be cleaned", async () => {
  const linked = harness({
    linked: true,
    row: {
      state: "ready",
      expires_at: new Date(Date.now() - 10000).toISOString(),
    },
  });
  assert.equal((await linked.api.cancelVideoUpload(id, course)).status, 409);
  await assert.rejects(linked.api.cleanupStaleVideoUpload(id), /LINKED/);
  assert.equal(linked.calls.length, 0);
  const fresh = harness();
  await assert.rejects(fresh.api.cleanupStaleVideoUpload(id), /NOT_STALE/);
  assert.equal(fresh.calls.length, 0);
});
test("Provider cleanup failure keeps quota and provenance; successful retry marks deletion", async () => {
  let ok = false;
  const h = harness({
    row: { expires_at: new Date(Date.now() - 10000).toISOString() },
    fetch: async () => new Response(null, { status: ok ? 204 : 502 }),
  });
  await assert.rejects(h.api.cleanupStaleVideoUpload(id));
  assert.equal(h.row.state, "failed");
  assert.equal(h.row.provider_asset_id, video);
  ok = true;
  await h.api.cleanupStaleVideoUpload(id);
  assert.equal(h.row.state, "deleted");
  assert.equal(h.row.upload_url, null);
});
for (const status of ["timed_out", "cancelled", "errored"])
  test(`Expired Mux upload ${status} without an asset releases tracked quota without an invalid cancellation`, async () => {
    const h = harness({
      row: {
        provider: "mux",
        provider_asset_id: null,
        expires_at: new Date(Date.now() - 10000).toISOString(),
      },
      fetch: async () => Response.json({ data: { status } }),
    });
    await h.api.cleanupStaleVideoUpload(id);
    assert.equal(h.row.state, "deleted");
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].init.method, undefined);
  });
test("Cleanup server actions check super-admin access before any privileged read or deletion", async () => {
  let privileged = 0;
  const api = load("app/actions/video-upload-cleanup.ts", {
    "@/lib/auth/admin-access": {
      requireSuperAdmin: async () => {
        throw new Error("redirect");
      },
    },
    "@/lib/supabase/admin": {
      createAdminClient: () => {
        privileged++;
        throw new Error();
      },
    },
    "@/lib/video-upload-policy": policy,
    "@/lib/video-uploads": {
      cleanupStaleVideoUpload: () => {
        privileged++;
        throw new Error();
      },
    },
    "next/cache": { revalidatePath() {} },
  });
  await assert.rejects(api.getStaleVideoUploads(), /redirect/);
  await assert.rejects(api.removeStaleVideoUpload(id), /redirect/);
  assert.equal(privileged, 0);
});
