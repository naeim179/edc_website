import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function documents(language) {
  const cache = new Map();
  const mocks = {
    "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
    "@/components/LanguageProvider": { useLanguage: () => ({ language }) },
    "@/components/DisplaySettings": { __esModule: true, default: () => React.createElement("button", {}, "Settings") },
    "@/components/BrandLogo": { __esModule: true, default: () => React.createElement("span", {}, "Your Way Academy") },
  };
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const loaded = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: name => {
      if (mocks[name]) return mocks[name];
      if (name.startsWith("@/")) return load(`${name.slice(2)}.${name.startsWith("@/components/") ? "tsx" : "ts"}`);
      return require(name);
    } });
    cache.set(path, loaded.exports);
    return loaded.exports;
  }
  const content = load("lib/site-information.ts");
  const render = (file, props = {}) => renderToStaticMarkup(React.createElement(load(`components/${file}.tsx`).default, props));
  return { ...content, render };
}

for (const language of ["ar", "en"]) {
  test(`All six public information pages have localized content and honest draft status (${language})`, () => {
    const { informationPages, INFORMATION_ORDER, DRAFT_NOTICE, render } = documents(language);
    assert.equal(INFORMATION_ORDER.length, 6);
    for (const pageId of INFORMATION_ORDER) {
      const page = informationPages[pageId];
      const html = render("InformationPage", { pageId });
      assert.ok(html.includes(`<h1>${page.title[language]}</h1>`));
      assert.ok(html.includes(page.intro[language]));
      assert.equal(html.includes(`<p class="yw-policy-notice">${DRAFT_NOTICE[language]}</p>`), page.draft);
      assert.ok(html.includes(`dir="${language === "ar" ? "rtl" : "ltr"}"`));
      assert.doesNotMatch(html, /<form|<input/);
    }
  });
  test(`Footer links every document and contact uses the supplied mailbox (${language})`, () => {
    const { INFORMATION_ORDER, SUPPORT_EMAIL, render } = documents(language);
    const html = render("SiteFooter");
    for (const id of INFORMATION_ORDER) assert.ok(html.includes(`href="/${id}"`));
    const contact = render("InformationPage", { pageId: "contact" });
    assert.ok(contact.includes(`href="mailto:${SUPPORT_EMAIL}"`));
    assert.match(contact, language === "ar" ? /لم يتم التحقق/ : /not yet been verified/);
  });
  test(`Checkout policy links preserve the checkout tab without claiming draft consent (${language})`, () => {
    const { render } = documents(language);
    const html = render("CheckoutPolicyLinks");
    assert.equal((html.match(/target="_blank"/g) ?? []).length, 5);
    assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 5);
    assert.doesNotMatch(html, /<input|<form|<button/);
    assert.match(html, language === "ar" ? /لا يُعد الدفع موافقة/ : /does not constitute agreement/);
  });
  test(`Agreement preview is disabled and cannot submit consent (${language})`, () => {
    const { render } = documents(language);
    const html = render("PolicyReview");
    assert.match(html, /type="checkbox" disabled=""/);
    assert.doesNotMatch(html, /<form|type="submit"/);
    assert.match(html, language === "ar" ? /التجديد التلقائي مستقلة/ : /renewal consent remains separate/);
  });
}
