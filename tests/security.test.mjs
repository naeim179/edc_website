import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createHash, generateKeyPairSync, webcrypto } from "node:crypto";
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
    process: { env }, URL, Response,Request,TextDecoder,TextEncoder,AbortSignal,btoa, console: { ...console, error() {} }, ...globals,
  }, { filename: file });
  return loadedModule.exports;
}
function query(result) {
  return new Proxy({}, { get: (_, key) => key === "maybeSingle"
    ? async () => result : () => query(result) });
}

function courseAccess({ user = { id: "assigned-teacher" }, profile = { role: "teacher" }, assigned = true, authError = null, profileError = null, assignmentError = null } = {}) {
  const state = { user, profile, assigned, authError, profileError, assignmentError };
  const client = {
    auth: { getUser: async () => ({ data: { user: state.user }, error: state.authError }) },
    rpc(name) {
      assert.equal(name, "read_own_profile");
      return {
        select() { return this; },
        async single() { return { data: state.profile, error: state.profileError }; },
      };
    },
    from(table) {
      const builder = {
        select() { return this; }, eq() { return this; },
        async maybeSingle() { return { data: state.assigned ? { id: "old-assignment" } : null, error: state.assignmentError }; },
      };
      assert.equal(table, "course_instructors");
      return builder;
    },
  };
  const { canManageCourse } = load("lib/auth/can-manage-course.ts", {
    "@/lib/supabase/server": { createClient: async () => client },
  });
  return { state, canManageCourse };
}

test("Course management is revoked during an existing session even if the assignment remains", async () => {
  const { state, canManageCourse } = courseAccess();
  assert.equal(await canManageCourse("course"), true);
  state.profile = { role: "student" };
  assert.equal(await canManageCourse("course"), false);
  state.profile = { role: "teacher" };
  state.assigned = false;
  assert.equal(await canManageCourse("course"), false);
});

for (const [name, profile, expected] of [
  ["assigned teacher", { role: "teacher" }, true],
  ["student with an old assignment", { role: "student" }, false],
  ["missing profile", null, false],
  ["super admin", { role: "admin", is_super_admin: true }, true],
  ["course admin", { role: "admin", permissions: ["manage_courses"] }, true],
  ["limited admin with an old assignment", { role: "admin", permissions: ["view_orders"] }, false],
]) {
  test(`Course management permissions: ${name}`, async () => {
    assert.equal(await courseAccess({ profile }).canManageCourse("course"), expected);
  });
}

test("An admin loses course access immediately when the permission is removed", async () => {
  const { state, canManageCourse } = courseAccess({ profile: { role: "admin", permissions: ["manage_courses"] } });
  assert.equal(await canManageCourse("course"), true);
  state.profile = { role: "admin", permissions: [] };
  assert.equal(await canManageCourse("course"), false);
});

test("Course management fails closed for missing identity and failed authorization queries", async () => {
  for (const options of [
    { user: null },
    { authError: { message: "invalid session" } },
    { profileError: { message: "unavailable" } },
    { assignmentError: { message: "unavailable" } },
  ]) assert.equal(await courseAccess(options).canManageCourse("course"), false);
});

test("A demoted teacher cannot invoke a lesson edit or prepare an upload with an old assignment", async () => {
  const { canManageCourse } = courseAccess({ profile: { role: "student" } });
  let privilegedClients = 0, providerRequests = 0;
  const mocks = {
    "@/lib/auth/can-manage-course": { canManageCourse },
    "@/lib/supabase/admin": { createAdminClient() { privilegedClients++; throw new Error("Must not access privileged data"); } },
    "@/lib/lesson-video": {},
    "next/cache": { revalidatePath() {} },
  };
  const actions = load("app/actions/teacher-content.ts", mocks);
  await assert.rejects(actions.teacherUpdateLesson("lesson", "course", "section", new FormData()), /Unauthorized/);
  const env = {
    BUNNY_LIBRARY_ID: "test-library", BUNNY_API_KEY: "test-only",
  };
  const upload = load("lib/video-uploads.ts",{...mocks,"@/lib/video-upload-policy":load("lib/video-upload-policy.ts"),"@/lib/supabase/server":{}},env,{fetch(){providerRequests++;throw new Error("Must not contact provider");}});
  const route = load("app/api/bunny/upload/route.ts",{"@/lib/video-uploads":upload});
  assert.equal((await route.POST(new Request("https://test.invalid/api/bunny/upload",{method:"POST",body:JSON.stringify({courseId:"course",size:1,type:"video/mp4"})}))).status,403);
  assert.equal(privilegedClients, 0);
  assert.equal(providerRequests, 0);
});

const lessonId = "30000000-0000-4000-8000-000000000001";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const muxEnv = { MUX_SIGNING_KEY_ID: "test-key", MUX_SIGNING_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }) };
function lessonPlayback(provider, { lesson = null, allowed = false, rpcError = null } = {}) {
  return load("lib/lesson-playback-access.ts", {
    "@/lib/supabase/server": { createClient: async () => ({
      from(table) {
        assert.equal(table, "lessons");
        return {
          select() { return this; },
          eq(column, value) {
            assert.equal(value, { id: lessonId, video_provider: provider }[column]);
            return this;
          },
          async maybeSingle() { return { data: lesson }; },
        };
      },
      async rpc(name, args) {
        assert.equal(name, "can_read_lesson");
        assert.equal(args.p_section_id, lesson.section_id);
        assert.equal(args.p_is_free_preview, Boolean(lesson.is_free_preview));
        return { data: allowed, error: rpcError };
      },
    }) },
  });
}
function muxRoute(options) {
  return load("app/api/mux/token/route.ts", {
    "@/lib/lesson-playback-access": lessonPlayback("mux", options),
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
    const { token, expiresInSeconds } = await response.json();
    const claims = jwt.verify(token, publicKey, { algorithms: ["RS256"], audience: "v" });
    assert.equal(claims.sub, "database-video");
    assert.equal(expiresInSeconds, 20 * 60);
    assert.equal(claims.exp - claims.iat, expiresInSeconds);
    assert.match(response.headers.get("cache-control"), /no-store/);
  });
}
test("Mux fails closed when the access check fails", async () => {
  const post = muxRoute({ lesson: { section_id: "section", mux_playback_id: "private" }, rpcError: { message: "db offline" } });
  assert.equal((await post({ json: async () => ({ lessonId }) })).status, 500);
});

const bunnyVideo = "30000000-0000-4000-8000-000000000002";
const bunnyLesson = { section_id: "section", bunny_library_id: "123", bunny_video_id: bunnyVideo };
const bunnyEnv = { BUNNY_TOKEN_AUTH_KEY: "embed-key", BUNNY_API_KEY: "upload-key", BUNNY_LIBRARY_ID: "123" };
const signedAt = 1_800_000_000;

function bunnyRoute(options, env = bunnyEnv) {
  return load("app/api/bunny/playback/route.ts", {
    "@/lib/lesson-playback-access": lessonPlayback("bunny", options),
  }, env, { crypto: webcrypto, Date: { now: () => signedAt * 1000 } }).POST;
}

test("Bunny signs the authorized database video with its separate embed key", async () => {
  const post = bunnyRoute({ lesson: bunnyLesson, allowed: true });
  const response = await post({ json: async () => ({ lessonId, videoId: "injected", libraryId: "999" }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const { url } = await response.json();
  const embed = new URL(url);
  const expires = signedAt + 600;
  assert.equal(embed.origin, "https://player.mediadelivery.net");
  assert.equal(embed.pathname, `/embed/123/${bunnyVideo}`);
  assert.equal(embed.searchParams.get("expires"), String(expires));
  assert.equal(embed.searchParams.get("token"), createHash("sha256").update(`embed-key${bunnyVideo}${expires}`).digest("hex"));
  assert.ok(!url.includes("embed-key"));
});

test("Bunny refuses links for inaccessible lessons, unconfigured signing, and foreign libraries", async () => {
  for (const [options, env, status] of [
    [{}, bunnyEnv, 403],
    [{ lesson: bunnyLesson }, bunnyEnv, 403],
    [{ lesson: bunnyLesson, allowed: true }, { ...bunnyEnv, BUNNY_TOKEN_AUTH_KEY: "" }, 503],
    [{ lesson: { ...bunnyLesson, bunny_library_id: "999" }, allowed: true }, bunnyEnv, 503],
  ]) {
    const response = await bunnyRoute(options, env)({ json: async () => ({ lessonId }) });
    assert.equal(response.status, status);
    assert.equal((await response.json()).url, undefined);
  }
});

function muxSessionClock(loadGrant) {
  let now = 0;
  let playing = true;
  let requests = 0;
  let failures = 0;
  let signal;
  const tokens = [];
  const timers = new Map();
  const { createMuxPlaybackSession } = load("lib/mux-playback-session.ts", {}, {}, {
    AbortController,
    Date: { now: () => now },
    setTimeout(callback, delay) {
      const id = Symbol();
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  });
  const session = createMuxPlaybackSession({
    load(requestSignal) {
      signal = requestSignal;
      try {
        return Promise.resolve(loadGrant(++requests));
      } catch (error) {
        return Promise.reject(error);
      }
    },
    isPlaying: () => playing,
    accept: token => tokens.push(token),
    unavailable: () => failures++,
  });
  return {
    session, tokens,
    set playing(value) { playing = value; },
    get requests() { return requests; },
    get failures() { return failures; },
    get aborted() { return signal.aborted; },
    async at(time) {
      now = time;
      for (const [id, timer] of timers) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

test("Playing Mux lessons renew before expiry and stop when authorization is denied", async () => {
  const clock = muxSessionClock(request => request < 3 ? { token: `token-${request}`, expiresInSeconds: 1200 } : null);
  await clock.at(0);
  await clock.at(1_079_999);
  assert.deepEqual(clock.tokens, ["token-1"]);
  await clock.at(1_080_000);
  assert.deepEqual(clock.tokens, ["token-1", "token-2"]);
  await clock.at(2_160_000);
  assert.equal(clock.failures, 1);
  assert.equal(clock.aborted, true);
  await clock.session.refreshIfNeeded();
  assert.equal(clock.requests, 3);
});

test("Paused Mux lessons renew on resume and retry temporary errors until expiry", async () => {
  const clock = muxSessionClock(request => {
    if (request === 1) return { token: "original", expiresInSeconds: 1200 };
    throw new Error("Network offline");
  });
  await clock.at(0);
  clock.playing = false;
  await clock.at(1_080_000);
  assert.equal(clock.requests, 1);
  clock.playing = true;
  await Promise.all([clock.session.refreshIfNeeded(), clock.session.refreshIfNeeded()]);
  assert.equal(clock.requests, 2);
  assert.equal(clock.failures, 0);
  await clock.at(1_100_000);
  assert.equal(clock.requests, 3);
  assert.deepEqual(clock.tokens, ["original"]);
  await clock.at(1_200_000);
  assert.equal(clock.failures, 1);
  assert.equal(clock.aborted, true);
});

test("Leaving a Mux lesson aborts pending playback authorization", async () => {
  let resolveGrant;
  const clock = muxSessionClock(() => new Promise(resolve => { resolveGrant = resolve; }));
  clock.session.stop();
  resolveGrant({ token: "late", expiresInSeconds: 1200 });
  await clock.at(0);
  assert.equal(clock.aborted, true);
  assert.deepEqual(clock.tokens, []);
});

test("Legacy Bunny upload targets cannot bypass size reservations, even with old ownership",async()=>{
 for(const allowed of [false,true]){
  let calls=0;
  const route=load("app/api/bunny/upload/[videoId]/route.ts",{
   "@/lib/auth/can-manage-course":{canManageCourse:async()=>allowed},
  },{}, {fetch(){calls++;throw new Error("No unreserved provider upload");}});
  const response=await route.PUT(new Request("https://test.invalid/api/bunny/upload/old",{method:"PUT",headers:{"x-course-id":"course"}}));
  assert.equal(response.status,allowed?410:403);assert.equal(calls,0);
 }
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
