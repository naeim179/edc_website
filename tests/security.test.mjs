import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { generateKeyPairSync } from "node:crypto";
import ts from "typescript";
import jwt from "jsonwebtoken";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
// Execute the real handlers in isolation; never contact a provider or database.
function load(file, mocks = {}, env = {}, globals = {}) {
  const output = ts.transpileModule(fs.readFileSync(new URL(file, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(output, {
    module: loadedModule, exports: loadedModule.exports,
    require: name => mocks[name] ?? (name === "next/server" ? { NextResponse: Response } : require(name)),
    process: { env }, URL, console: { ...console, error() {} }, ...globals,
  }, { filename: file });
  return loadedModule.exports;
}
function query(result) {
  return new Proxy({}, { get: (_, key) => key === "maybeSingle"
    ? async () => result : () => query(result) });
}
const lessonId = "30000000-0000-4000-8000-000000000001";
const videoId = "40000000-0000-4000-8000-000000000001";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const muxEnv = { MUX_SIGNING_KEY_ID: "test-key", MUX_SIGNING_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }) };
function muxRoute({ lesson = null, allowed = false, rpcError = null } = {}) {
  return load("app/api/mux/token/route.ts", {
    "@/lib/supabase/server": { createClient: async () => ({
      from: () => query({ data: lesson }), rpc: async () => ({ data: allowed, error: rpcError }),
    }) },
  }, muxEnv).POST;
}
test("Mux refuses the old arbitrary playbackId contract", async () => {
  const response = await muxRoute()({ json: async () => ({ playbackId: "unowned-video" }) });
  assert.equal(response.status, 400);
});
test("Mux denies a lesson hidden by RLS", async () => {
  const response = await muxRoute()({ json: async () => ({ lessonId }) });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).token, undefined);
});
test("Mux denies access even if an older permissive RLS policy returns a row", async () => {
  const response = await muxRoute({ lesson: { section_id: "section", mux_playback_id: "private" } })({ json: async () => ({ lessonId }) });
  assert.equal(response.status, 403);
});
for (const preview of [true, false]) {
  test(`Mux signs only the database playback ID for an authorized ${preview ? "preview" : "subscriber"}`, async () => {
    const post = muxRoute({ allowed: true, lesson: { section_id: "section", is_free_preview: preview, mux_playback_id: "database-video" } });
    const response = await post({ json: async () => ({ lessonId, playbackId: "injected-video" }) });
    assert.equal(response.status, 200);
    const { token } = await response.json();
    const claims = jwt.verify(token, publicKey, { algorithms: ["RS256"], audience: "v" });
    assert.equal(claims.sub, "database-video");
    assert.match(response.headers.get("cache-control"), /no-store/);
  });
}
test("Mux fails closed when the access check fails", async () => {
  const post = muxRoute({ lesson: { section_id: "section", mux_playback_id: "private" }, rpcError: { message: "db offline" } });
  assert.equal((await post({ json: async () => ({ lessonId }) })).status, 500);
});

function bunnyRoute({ courseAllowed = true, ownership = null, error = null } = {}) {
  const calls = [];
  const filters = {};
  const ownershipQuery = {
    select() { return this; },
    eq(key, value) { filters[key] = value; return this; },
    async maybeSingle() { return { data: ownership, error }; },
  };
  const route = load("app/api/bunny/upload/[videoId]/route.ts", {
    "@/lib/auth/can-manage-course": { canManageCourse: async () => courseAllowed },
    "@/lib/supabase/admin": { createAdminClient: () => ({ from: () => ownershipQuery }) },
  }, { BUNNY_LIBRARY_ID: "library", BUNNY_API_KEY: "test-only" }, {
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true }; },
  });
  return { put: () => route.PUT({ headers: new Headers({ "x-course-id": "owned-course" }), body: null }, { params: Promise.resolve({ videoId }) }), calls, filters };
}
test("Bunny refuses a user without course management access", async () => {
  const { put, calls } = bunnyRoute({ courseAllowed: false });
  assert.equal((await put()).status, 403);
  assert.equal(calls.length, 0);
});
test("Bunny refuses an unknown or foreign video without contacting Bunny", async () => {
  const { put, calls, filters } = bunnyRoute();
  assert.equal((await put()).status, 403);
  assert.equal(calls.length, 0);
  assert.deepEqual(filters, { video_id: videoId, course_id: "owned-course", library_id: "library" });
});
test("Bunny fails closed when ownership storage is unavailable", async () => {
  const { put, calls } = bunnyRoute({ error: { message: "offline" } });
  assert.equal((await put()).status, 500);
  assert.equal(calls.length, 0);
});
test("Bunny forwards an upload after both course and video authorization", async () => {
  const { put, calls } = bunnyRoute({ ownership: { video_id: videoId } });
  assert.equal((await put()).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "PUT");
});
test("Bunny does not issue an upload target when ownership cannot be persisted", async () => {
  const route = load("app/api/bunny/upload/route.ts", {
    "@/lib/auth/can-manage-course": { canManageCourse: async () => true },
    "@/lib/supabase/admin": { createAdminClient: () => ({ from: () => ({ insert: async () => ({ error: { message: "offline" } }) }) }) },
  }, { BUNNY_LIBRARY_ID: "library", BUNNY_API_KEY: "test-only" }, {
    fetch: async () => ({ ok: true, json: async () => ({ guid: videoId }) }),
  });
  const response = await route.POST({ json: async () => ({ courseId: "owned-course" }) });
  assert.equal(response.status, 500);
  assert.equal((await response.json()).videoId, undefined);
});

const { getImageObjectPath } = load("lib/storage-images.ts");
test("Image paths accept this project's public images and reject foreign URLs", () => {
  const project = "https://project.supabase.co";
  assert.equal(getImageObjectPath(`${project}/storage/v1/object/public/images/teachers/a.jpg`, project), "teachers/a.jpg");
  for (const value of ["https://other.test/images/teachers/a.jpg", `${project}/storage/v1/object/public/other/a.jpg`, `${project}/storage/v1/object/public/images/a/%2e%2e%2fb.jpg`, "bad-url"]) {
    assert.equal(getImageObjectPath(value, project), null);
  }
});
test("Teacher avatar deletion uses the caller's storage RLS instead of the service role", async () => {
  let callerDeletes = 0;
  let cleared = false;
  const caller = {
    auth: { getUser: async () => ({ data: { user: { id: "teacher" } } }) },
    from: () => query({ data: { role: "teacher" } }),
    storage: { from: () => ({ remove: async () => { callerDeletes++; return {}; } }) },
  };
  const admin = {
    from: () => ({ ...query({ data: null }),
      select: () => query({ data: { image_url: "https://project.supabase.co/storage/v1/object/public/images/other-teacher/a.jpg" } }),
      update: () => ({ eq: async () => { cleared = true; return {}; } }),
    }),
    get storage() { throw new Error("Service role must never delete caller-provided image paths"); },
  };
  const actions = load("app/actions/teacher-profile.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/storage-images": { getImageObjectPath },
    "@/lib/supabase/server": { createClient: async () => caller },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
    "@/lib/auth/admin-access": { hasAdminPermission: async () => false },
  }, { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" });
  await actions.deleteTeacherAvatar("teacher");
  assert.equal(callerDeletes, 1);
  assert.equal(cleared, true);
});
