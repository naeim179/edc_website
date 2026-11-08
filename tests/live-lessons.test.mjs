import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
function load(path, mocks) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: name => mocks[name] ?? require(name), URL, FormData });
  return loaded.exports;
}
const video = load('../lib/lesson-video.ts', {});
function actions() {
  const inserted = [];
  const db = { from: table => ({
    select() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: { id: 'section' } }; },
    async insert(row) { inserted.push({ table, row }); return { error: null }; },
  }) };
  const api = load('../app/actions/teacher-content.ts', {
    'next/cache': { revalidatePath() {} },
    '@/lib/supabase/admin': { createAdminClient: () => db },
    '@/lib/auth/can-manage-course': { canManageCourse: async () => true },
    '@/lib/lesson-video': video,
  });
  return { ...api, inserted };
}
function form(type, url = '') {
  const f = new FormData();
  f.set('title', 'A lesson'); f.set('lesson_type', type);
  f.set('live_platform', 'zoom'); f.set('content_url', url);
  return f;
}
test('Teacher creates a live Zoom lesson without any YouTube fields', async () => {
  const a = actions();
  await a.teacherCreateLesson('section', 'course', form('live', 'https://zoom.us/j/123456789'));
  assert.equal(a.inserted[0].row.lesson_type, 'live');
  assert.equal(a.inserted[0].row.content_url, 'https://zoom.us/j/123456789');
  assert.equal(a.inserted[0].row.video_provider, null);
  assert.equal(a.inserted[0].row.youtube_video_id, null);
});
test('Live meeting URL is still required, and recorded YouTube still validates its own URL', async () => {
  const a = actions();
  await assert.rejects(a.teacherCreateLesson('section', 'course', form('live')), /رابط الجلسة/);
  await assert.rejects(a.teacherCreateLesson('section', 'course', form('recorded')));
  assert.equal(a.inserted.length, 0);
});
test('Switching lesson type removes required recorded-video fields for live sessions', () => {
  for (const type of ['recorded', 'live']) {
    const component = load('../components/lessons/LessonTypeFields.tsx', {
      react: { useState: () => [type, () => {}] },
      '@/components/LanguageProvider': { useLanguage: () => ({ t: { lessonType: {} } }) },
      '@/components/lessons/LessonVideoFields': { __esModule: true, default: () => require('react').createElement('input', { required: true, name: 'youtube_url' }) },
    }).default;
    const html = renderToStaticMarkup(require('react').createElement(component, { courseId: 'course' }));
    assert.equal(html.includes('name="youtube_url"'), type === 'recorded');
    assert.equal(html.includes('name="content_url"'), type === 'live');
  }
});
