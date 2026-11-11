import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const m = { exports: {} };
  vm.runInNewContext(code, {
    module: m,
    exports: m.exports,
    require: (name) => mocks[name] ?? require(name),
    URL,
    URLSearchParams,
    FormData,
    console,
  });
  return m.exports;
}
const lists = load("lib/list-pages.ts");
const { securityHeaders } = load("lib/security-headers.ts");
test("Production security headers preserve video providers and forbid framing and object embeds", () => {
  const headers = Object.fromEntries(
    securityHeaders().map((h) => [h.key, h.value]),
  );
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.match(headers["Strict-Transport-Security"], /31536000/);
  const csp = headers["Content-Security-Policy"];
  for (const value of [
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "worker-src 'self' blob:",
    "https://www.youtube.com",
    "https://iframe.mediadelivery.net",
    "https://player.mediadelivery.net",
    "https://*.mux.com",
    "wss://*.supabase.co",
  ])
    assert.ok(csp.includes(value), value);
  assert.doesNotMatch(csp, /unsafe-eval|http:\/\/localhost|ws:/);
});
test("Development headers allow local HMR without persisting HSTS", () => {
  const headers = Object.fromEntries(
    securityHeaders(true).map((h) => [h.key, h.value]),
  );
  assert.match(headers["Content-Security-Policy"], /unsafe-eval/);
  assert.equal(headers["Strict-Transport-Security"], undefined);
});
test("Pagination normalizes duplicate, malformed and oversized URL parameters", () => {
  for (const page of ["-3", "NaN", "1e10", "<script>"])
    assert.equal(lists.listFilters({ page }).page, 1);
  assert.equal(
    lists.listFilters({ page: "999999999999999999999999" }).page,
    100000,
  );
  const filters = lists.listFilters({
    q: [" hello ", "ignored"],
    page: ["2", "99"],
  });
  assert.equal(filters.q, "hello");
  assert.equal(filters.page, 2);
  assert.equal(lists.listFilters({ q: "x".repeat(999) }).q.length, 120);
});
test("Pagination URLs preserve filters and encode search as a value rather than query syntax", () => {
  const href = lists.pageHref(
    "/courses",
    { q: "C++ & status=paid", category: "أمن المعلومات", price: "paid" },
    2,
  );
  const url = new URL(href, "https://example.test");
  assert.equal(url.searchParams.get("q"), "C++ & status=paid");
  assert.equal(url.searchParams.get("status"), null);
  assert.equal(url.searchParams.get("category"), "أمن المعلومات");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.hash, "#list-results");
});
for (const language of ["ar", "en"])
  test(`Pagination labels and current-page semantics support ${language}`, () => {
    const Pagination = load("components/ui/Pagination.tsx", {
      "next/link": {
        __esModule: true,
        default: ({ children, prefetch, ...props }) => {
          void prefetch;
          return React.createElement("a", props, children);
        },
      },
      "@/components/LanguageProvider": { useLanguage: () => ({ language }) },
      "@/lib/list-pages": lists,
    }).default;
    const html = renderToStaticMarkup(
      React.createElement(Pagination, {
        page: 8,
        totalPages: 20,
        total: 240,
        pageSize: 12,
        pathname: "/courses",
        query: { q: "search", price: "paid" },
      }),
    );
    assert.match(html, /aria-current="page"/);
    assert.ok(
      html.includes(language === "ar" ? "صفحات النتائج" : "Results pages"),
    );
    assert.equal((html.match(/aria-label="(?:Page|صفحة) /g) ?? []).length, 5);
    assert.ok(html.includes("price=paid"));
  });

test("Catalog paging passes server filters and merges only the signed-in student's progress", async () => {
  let params;
  const api = load("lib/course-pages.ts", { "@/lib/supabase/server": {} });
  const data = {
    items: [{ id: "course-a", title: "A", lesson_count: 3, is_free: false }],
    total: 1,
    page: 1,
    pageSize: 12,
    totalPages: 1,
    categories: [],
    summary: {},
  };
  const filters = lists.listFilters({ q: "teacher", page: "3", price: "paid" });
  await api.loadCoursePage(
    {
      rpc: async (name, args) => {
        assert.equal(name, "list_course_catalog_page");
        params = args;
        return { data };
      },
    },
    filters,
  );
  assert.equal(params.p_page, 3);
  assert.equal(params.p_price, "paid");
  assert.equal(params.p_admin, false);
  const mapped = api.catalogItems(data, [{ id: "other-course", progress: 99 }]);
  assert.equal(mapped[0].progress, 0);
  assert.equal(mapped[0].enrolled, false);
});
test("Order lists check permission and sign proofs only for rows returned by the requested page", async () => {
  let permitted = false,
    params;
  const signed = [];
  const api = load("app/actions/admin-orders.ts", {
    "@/lib/auth/admin-access": {
      requirePermission: async () => {
        permitted = true;
      },
      requireSuperAdmin: async () => {},
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        rpc: async (name, args) => {
          assert.equal(permitted, true);
          assert.equal(name, "admin_list_orders_page");
          params = args;
          return {
            data: {
              items: [
                { id: "one", payment_proof: "proof/one" },
                { id: "two", payment_proof: null },
              ],
              total: 42,
              page: 2,
              pageSize: 20,
              totalPages: 3,
            },
          };
        },
      }),
    },
    "@/lib/supabase/admin": {
      createAdminClient: () => ({
        storage: {
          from: () => ({
            createSignedUrl: async (path) => {
              signed.push(path);
              return { data: { signedUrl: "https://example.test/proof" } };
            },
          }),
        },
      }),
    },
  });
  const result = await api.getAdminOrdersPage(
    lists.listFilters({ page: "2", status: "pending", q: "student" }),
  );
  assert.equal(params.p_page, 2);
  assert.equal(params.p_status, "pending");
  assert.equal(result.items.length, 2);
  assert.deepEqual(signed, ["proof/one"]);
});
test("Unauthorized order-list calls never query orders or create privileged clients", async () => {
  const api = load("app/actions/admin-orders.ts", {
    "@/lib/auth/admin-access": {
      requirePermission: async () => {
        throw new Error("Denied");
      },
    },
    "@/lib/supabase/server": {
      createClient: () => {
        throw new Error("Must not read orders");
      },
    },
    "@/lib/supabase/admin": {
      createAdminClient: () => {
        throw new Error("Must not sign proofs");
      },
    },
  });
  await assert.rejects(api.getAdminOrdersPage(lists.listFilters({})), /Denied/);
});
test("Teacher creation rejects a short new password before reaching the Auth administrator", async () => {
  const api = load("app/actions/teachers.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/password-policy": load("lib/password-policy.ts"),
    "@/lib/auth/admin-access": {
      requirePermission: async () => {},
      requireSuperAdmin: async () => {},
    },
    "@/lib/supabase/admin": {
      createAdminClient: () => {
        throw new Error("Must not create an Auth user");
      },
    },
  });
  const form = new FormData();
  form.set("fullName", "Teacher");
  form.set("email", "test@example.test");
  form.set("password", "123456");
  await assert.rejects(api.createTeacher(form), /8/);
});
