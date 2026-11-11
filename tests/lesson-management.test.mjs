import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    require: name => mocks[name] ?? require(name),
    URL, FormData, console,
  }, { filename: file });
  return loaded.exports;
}
const i18n = Object.fromEntries(["ar", "en"].map(language => [language, load(`lib/i18n/${language}.ts`)[language]]));
const emptyAction = async () => {};
const baseLesson = {
  id: "lesson", title: "A course lesson", content_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  video_provider: "bunny", mux_asset_id: null, mux_playback_id: null,
  youtube_video_id: "dQw4w9WgXcQ",
  bunny_library_id: "760710", bunny_video_id: "40000000-0000-4000-8000-000000000001",
  lesson_type: "recorded", live_platform: null, live_schedule: null, order_index: 1, is_free_preview: false,
  updateAction: emptyAction, deleteAction: emptyAction,
};
function manager(language) {
  const languageMock = { useLanguage: () => ({ language, t: i18n[language] }) };
  const video = load("components/lessons/LessonVideoFields.tsx", { "@/components/LanguageProvider": languageMock, "@/lib/video-upload-policy": load("lib/video-upload-policy.ts") });
  const type = load("components/lessons/LessonTypeFields.tsx", {
    "@/components/LanguageProvider": languageMock,
    "@/components/lessons/LessonVideoFields": video,
  });
  return load("components/lessons/LessonManager.tsx", {
    "@/components/LanguageProvider": languageMock,
    "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
    "./LessonVideoFields": video, "./LessonTypeFields": type,
  }).default;
}
function renderManager(language, lesson = baseLesson) {
  return renderToStaticMarkup(React.createElement(manager(language), {
    courseId: "course", sectionTitle: "Section", backHref: "/teacher/courses/course/sections",
    createAction: emptyAction, lessons: [lesson],
  }));
}
function editForm(html) {
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)]
    .find(([, body]) => body.includes('id="title-lesson"'))?.[1];
  assert.ok(form, "Existing lesson edit form must be rendered");
  const data = new FormData();
  for (const [input] of form.matchAll(/<input\b[^>]*>/g)) {
    const name = input.match(/\bname="([^"]+)"/)?.[1];
    const value = input.match(/\bvalue="([^"]*)"/)?.[1];
    if (name && value !== undefined) data.set(name, value);
  }
  return data;
}

for (const provider of ["bunny", "mux", "youtube"]) {
  test(`Editing an existing ${provider} lesson preserves its provider and video when saving a title`, async () => {
    const lesson = { ...baseLesson, content_url: null, video_provider: provider,
      mux_playback_id: provider === "mux" ? "mux-playback" : null,
      mux_asset_id: provider === "mux" ? "mux-asset" : null,
      bunny_library_id: provider === "bunny" ? baseLesson.bunny_library_id : null,
      bunny_video_id: provider === "bunny" ? baseLesson.bunny_video_id : null,
    };
    const form = editForm(renderManager("en", lesson));
    assert.equal(form.get("video_provider"), provider);
    form.set("title", "Changed title only");
    const saved = [];
    const db = { from(table) { return {
      select() { return this; }, eq() { return this; },
      async maybeSingle() { return { data: { id: table === "sections" ? "section" : "lesson" } }; },
      update(row) { saved.push(row); return this; },
      then(resolve) { return Promise.resolve(resolve({ error: null })); },
    }; } };
    const mocks = {
      "next/cache": { revalidatePath() {} },
      "@/lib/auth/can-manage-course": { canManageCourse: async () => true },
      "@/lib/supabase/admin": { createAdminClient: () => db },
      "@/lib/supabase/server": { createClient: async () => db },
      "@/lib/lesson-video": load("lib/lesson-video.ts"),
    };
    const teacher = load("app/actions/teacher-content.ts", mocks);
    const admin = load("app/actions/admin-lessons.ts", mocks);
    await teacher.teacherUpdateLesson("lesson", "course", "section", form);
    await admin.updateLesson("lesson", "course", "section", form);
    assert.equal(saved.length, 2);
    for (const row of saved) {
      assert.equal(row.title, "Changed title only");
      assert.equal(row.video_provider, provider);
      assert.equal(row.bunny_video_id, provider === "bunny" ? lesson.bunny_video_id : null);
      assert.equal(row.bunny_library_id, provider === "bunny" ? lesson.bunny_library_id : null);
      assert.equal(row.mux_playback_id, provider === "mux" ? lesson.mux_playback_id : null);
      assert.equal(row.youtube_video_id, provider === "youtube" ? "dQw4w9WgXcQ" : null);
    }
  });
}

for (const language of ["ar", "en"]) {
  test(`Lesson manager translates forms and direction in ${language} without translating user content`, () => {
    const html = renderManager(language, { ...baseLesson, title: "عنوان كتبه المستخدم" });
    assert.ok(html.includes(`dir="${language === "ar" ? "rtl" : "ltr"}"`));
    assert.ok(html.includes(i18n[language].teacher.addNewLesson));
    assert.ok(html.includes(i18n[language].teacher.saveChanges));
    assert.ok(html.includes(i18n[language].lessonType.type));
    assert.ok(html.includes(i18n[language].lessonEditor.order));
    assert.ok(html.includes("عنوان كتبه المستخدم"));
    assert.doesNotMatch(html, /\{t\.lessonVideo\./);
    if (language === "en") assert.doesNotMatch(html, /إضافة درس|نوع الدرس|حفظ التعديل|معاينة مجانية|حذف الدرس|يدعم روابط|اختر الفيديو/);
  });
}

test("Mux edit controls translate their existing-video and processing instructions", () => {
  const html = renderManager("en", { ...baseLesson, video_provider: "mux", mux_playback_id: "qa-playback", mux_asset_id: "qa-asset" });
  assert.ok(html.includes(i18n.en.lessonVideo.replaceVideo));
  assert.ok(html.includes(i18n.en.lessonVideo.saved));
  assert.doesNotMatch(html, /\{t\.lessonVideo\.|اختر الفيديو|تم حفظ بيانات|مدعومة/);
});

for (const mode of ["teacher", "admin"]) {
  test(`${mode} lesson page loads Bunny defaults and scopes the section to the authorized course`, async () => {
    const queries = [];
    const db = { from(table) { const q = { table, filters: [] };queries.push(q);return {
      select(columns) { q.columns = columns; return this; },
      eq(column, value) { q.filters.push([column, value]); return this; },
      async maybeSingle() { return { data: { id: "section", title: "Section" } }; },
      async order() { return { data: [baseLesson] }; },
    }; } };
    const api = { teacherCreateLesson: emptyAction, teacherUpdateLesson: emptyAction, teacherDeleteLesson: emptyAction,
      createLesson: emptyAction, updateLesson: emptyAction, deleteLesson: emptyAction };
    const page = load(`app/${mode}/courses/[id]/sections/[sectionId]/lessons/page.tsx`, {
      "next/navigation": { notFound() { throw new Error("Not found"); } },
      "@/components/AppShell": { __esModule: true, default: () => null },
      "@/components/lessons/LessonManager": { __esModule: true, default: () => null },
      "@/lib/auth/require-teacher": { requireTeacher: async () => ({ id: "teacher" }) },
      "@/lib/auth/can-manage-course": { canManageCourse: async () => true },
      "@/lib/supabase/admin": { createAdminClient: () => db },
      "@/lib/supabase/server": { createClient: async () => db },
      "@/app/actions/teacher-content": api, "@/app/actions/admin-lessons": api,
    }).default;
    const tree = await page({ params: Promise.resolve({ id: "course", sectionId: "section" }) });
    const props = tree.props.children.props;
    assert.equal(props.lessons[0].bunny_video_id, baseLesson.bunny_video_id);
    assert.match(queries.find(q => q.table === "lessons").columns, /bunny_library_id,bunny_video_id/);
    assert.ok(queries.find(q => q.table === "sections").filters.some(([key, value]) => key === "course_id" && value === "course"));
  });
}

for (const [role, expected] of [["student", "/my-courses"], [null, "/my-courses"], ["teacher", null], ["admin", null]]) {
  test(`Teacher page guard handles ${role ?? "missing profile"} with an expected navigation outcome`, async () => {
    const guard = load("lib/auth/require-teacher.ts", {
      "next/navigation": { redirect(destination) { throw Object.assign(new Error("redirect"), { destination }); } },
      "@/lib/supabase/server": { createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
        from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: role ? { role } : null }) }),
      }) },
    }).requireTeacher;
    if (expected) await assert.rejects(guard(), e => e.destination === expected);
    else assert.equal((await guard()).id, "user");
  });
}

test("Anonymous teacher requests go to login without reading private profiles", async () => {
  const guard = load("lib/auth/require-teacher.ts", {
    "next/navigation": { redirect(destination) { throw Object.assign(new Error("redirect"), { destination }); } },
    "@/lib/supabase/server": { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: null } }) },
      from() { throw new Error("Must not query private data"); },
    }) },
  }).requireTeacher;
  await assert.rejects(guard(), e => e.destination === "/login");
});

for (const language of ["ar", "en"]) {
  test(`Video player feedback follows ${language} without making provider requests`, () => {
    const Player = load("components/lessons/LessonVideoPlayer.tsx", {
      "@/components/LanguageProvider": { useLanguage: () => ({ language, t: i18n[language] }) },
      "@mux/mux-player-react": { __esModule: true, default: () => null },
    }).default;
    for (const [props, message] of [
      [{ provider: null }, "noVideo"],
      [{ provider: "mux", muxPlaybackId: "playback" }, "playbackLoading"],
      [{ provider: "bunny" }, "incomplete"],
    ]) {
      const html = renderToStaticMarkup(React.createElement(Player, { lessonId: "lesson", title: "Lesson", ...props }));
      assert.ok(html.includes(i18n[language].lessonVideo[message]));
    }
  });
}
