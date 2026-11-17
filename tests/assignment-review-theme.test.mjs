import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const css = fs.readFileSync(new URL("../app/calm-theme.css", import.meta.url), "utf8");
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: (name) => mocks[name] ?? require(name) });
  return loaded.exports;
}
function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

test("Assignment review header and answers use theme surfaces with readable primary and secondary text", () => {
  for (const language of ["ar", "en"]) {
    const copy = load(`lib/i18n/${language}.ts`)[language];
    const Card = load("components/assignments/AssignmentSubmissionReviewCard.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/components/LanguageProvider": { useLanguage: () => ({ language, t: copy }) },
      "@/app/actions/assignment-grading": {},
    }).default;
    const html = renderToStaticMarkup(React.createElement(Card, {
      assignmentId: "assignment",
      maxScore: 100,
      submission: {
        id: "submission", studentName: "Student Name", status: "submitted", attemptNumber: 1,
        submittedAt: null, text: "Written answer", links: [], files: [], audio: [], score: null, feedback: null,
      },
    }));
    assert.match(html, /<h2 class="[^"]*text-\[var\(--brand-text\)\][^"]*">Student Name<\/h2>/);
    assert.match(html, /<div class="border-b [^"]*bg-\[var\(--brand-bg\)\]/);
    assert.match(html, /<p class="[^"]*text-\[var\(--brand-text-muted\)\]/);
    assert.match(html, /<p class="whitespace-pre-wrap [^"]*text-\[var\(--brand-text\)\]/);
    assert.match(html, new RegExp(`dir="${language === "ar" ? "rtl" : "ltr"}"`));
  }
});

test("Review text and buttons meet WCAG AA contrast in light, dark and eye comfort themes", () => {
  for (const theme of ["light", "dark", "eye"]) {
    const selector = theme === "light" ? ":root" : `html[data-theme="${theme}"]`;
    const start = css.indexOf(`${selector} {`);
    assert.ok(start >= 0);
    const block = css.slice(start, css.indexOf("}", start));
    const tokens = Object.fromEntries([...block.matchAll(/--calm-([\w-]+):\s*(#[a-f\d]{6});/gi)].map((m) => [m[1], m[2]]));
    for (const background of ["bg", "surface"]) {
      for (const foreground of ["text", "muted"]) {
        assert.ok(contrast(tokens[foreground], tokens[background]) >= 4.5, `${theme}: ${foreground} on ${background}`);
      }
    }
    assert.ok(contrast(tokens["on-accent"], tokens.accent) >= 4.5, `${theme}: button label`);
  }
});
