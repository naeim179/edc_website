import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const element = React.createElement;
const icons = new Proxy({}, { get: () => () => element("svg") });

// Render the real dashboard with isolated UI dependencies and two different users.
function dashboard(props) {
  const output = ts.transpileModule(fs.readFileSync(new URL("../components/HomeContent.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mocks = {
    "next/image": { default: () => element("span") },
    "@/components/DisplaySettings": { default: () => element("button", {}, "Display settings") },
    "next/link": { default: ({ children, href, ...rest }) => element("a", { href, ...rest }, children) },
    "@/components/LanguageProvider": { useLanguage: () => ({ language: "ar", t: { home: {} } }) },
    "@/components/icons": icons,
    "lucide-react": icons,
    "@/components/CourseCover": { default: () => element("span") },
    "@/components/ui/ProgressBar": { default: ({ value }) => element("progress", { value, max: 100 }) },
    "@/components/CourseCatalogCard": { default: ({ id, title }) => element("a", { href: `/courses/${id}` }, title) },
  };
  for (const mock of Object.values(mocks)) {
    if (Object.hasOwn(mock, "default")) mock.__esModule = true;
  }
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded, exports: loaded.exports,
    require: name => mocks[name] ?? require(name),
  }, { filename: "HomeContent.tsx" });
  return renderToStaticMarkup(element(loaded.exports.default, props));
}

const course = {
  id: "owned-course", title: "دورة خاصة بالطالب", category: null, image: null,
  totalLessons: 10, completedLessons: 3, progress: 30, nextLessonId: "next-lesson",
  isFree: true, accessActive: true, expiresAt: null, daysRemaining: null, autoRenew: false,
};
const props = {
  isAuthenticated: true, displayName: "الطالب الأول",
  stats: { enrolled: 1, completedLessons: 3, completedCourses: 0 },
  continueCourse: course, studentCourses: [course],
  courses: [{ id: "public-course", title: "الدورة العامة" }],
};

test("Guests see public courses without a fabricated signed-in identity or student data", () => {
  const html = dashboard({ ...props, isAuthenticated: false, displayName: "", continueCourse: null, studentCourses: [] });
  assert.match(html, /الدورة العامة/);
  assert.doesNotMatch(html, /naim|الطالب الأول|دورة خاصة بالطالب|href="\/my-courses"|href="\/assignments"/i);
});

test("Each student sees the name, enrolled course and continue link supplied for that account", () => {
  const first = dashboard(props);
  const otherCourse = { ...course, id: "other-course", title: "دورة الطالب الثاني", nextLessonId: "other-lesson" };
  const second = dashboard({ ...props, displayName: "الطالب الثاني", continueCourse: otherCourse, studentCourses: [otherCourse] });
  assert.match(first, /الطالب الأول/);
  assert.match(first, /\/courses\/owned-course\/lessons\/next-lesson/);
  assert.match(second, /الطالب الثاني/);
  assert.match(second, /دورة الطالب الثاني/);
  assert.match(second, /\/courses\/other-course\/lessons\/other-lesson/);
  assert.doesNotMatch(second, /الطالب الأول|owned-course|naim/i);
});

test("Inactive access opens the course instead of advertising a paid lesson continue link", () => {
  const expired = { ...course, isFree: false, accessActive: false };
  const html = dashboard({ ...props, continueCourse: expired, studentCourses: [expired] });
  assert.match(html, /اشتراك هذه الدورة غير نشط/);
  assert.match(html, /href="\/courses\/owned-course"/);
  assert.doesNotMatch(html, /\/lessons\/next-lesson/);
});
