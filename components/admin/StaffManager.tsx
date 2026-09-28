"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { PERMISSION_KEYS } from "@/lib/permissions";
import {
  promoteToAdmin,
  revokeAdmin,
  setAdminPermissions,
  type StaffResult,
} from "@/app/admin/staff/actions";

type Admin = { id: string; fullName: string | null; email: string | null; permissions: string[] };

function PermissionChecks({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useLanguage();
  const toggle = (k: string) =>
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PERMISSION_KEYS.map((k) => (
        <label key={k} className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={value.includes(k)}
            onChange={() => toggle(k)}
            className="mt-1 size-4 accent-[#1B4B43]"
          />
          <span>
            <span className="block text-sm font-medium">{t.staff.permissions[k].label}</span>
            <span className="block text-xs text-[#1B4B43]/60">{t.staff.permissions[k].hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function AdminRow({ admin }: { admin: Admin }) {
  const { t } = useLanguage();
  const s = t.staff;
  const [perms, setPerms] = useState<string[]>(admin.permissions);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const show = (r: StaffResult, okMsg: string) => setMsg(r.ok ? okMsg : s.errors[r.error]);
  const dirty =
    JSON.stringify([...perms].sort()) !== JSON.stringify([...admin.permissions].sort());

  const save = () => start(async () => show(await setAdminPermissions(admin.id, perms), s.saved));
  const revoke = () => {
    if (!confirm(s.revokeConfirm)) return;
    start(async () => {
      const r = await revokeAdmin(admin.id);
      if (!r.ok) show(r, "");
    });
  };

  return (
    <li className="border-t border-[#1B4B43]/15 py-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-start"
      >
        <span>
          <span className="block font-medium">{admin.fullName || s.noName}</span>
          <span className="block text-xs text-[#1B4B43]/60" dir="ltr">{admin.email}</span>
        </span>
        <span className="text-xs text-[#C9704A]">
          {perms.length ? `${perms.length} ${s.sectionsOpen}` : s.noSections}
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-5">
          <PermissionChecks value={perms} onChange={setPerms} />
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className="rounded-lg bg-[#1B4B43] px-4 py-2 text-sm text-[#F7F3EC] disabled:opacity-40"
            >
              {pending ? s.saving : s.savePermissions}
            </button>
            <button type="button" onClick={revoke} disabled={pending} className="text-sm text-[#C9704A] hover:underline">
              {s.revoke}
            </button>
            {msg && <span role="status" className="text-xs text-[#1B4B43]/70">{msg}</span>}
          </div>
        </div>
      )}
    </li>
  );
}

export default function StaffManager({ admins }: { admins: Admin[] }) {
  const { t } = useLanguage();
  const s = t.staff;
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const r = await promoteToAdmin(email, perms);
      if (r.ok) { setEmail(""); setPerms([]); setMsg(s.added); }
      else setMsg(s.errors[r.error]);
    });

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 text-[#1B4B43]">
      <h1 className="text-2xl font-bold">{s.title}</h1>
      <p className="mt-2 text-sm text-[#1B4B43]/70">{s.subtitle}</p>

      <ul className="mt-8">
        {admins.length === 0 && (
          <li className="border-t border-[#1B4B43]/15 py-5 text-sm text-[#1B4B43]/60">{s.emptyList}</li>
        )}
        {admins.map((a) => <AdminRow key={a.id} admin={a} />)}
      </ul>

      <section className="mt-6 border-t border-[#1B4B43]/15 pt-8">
        <h2 className="text-lg font-bold">{s.addTitle}</h2>
        <p className="mt-1 text-xs text-[#1B4B43]/60">{s.addHint}</p>

        <input
          type="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={s.emailPlaceholder}
          className="mt-4 w-full rounded-lg border border-[#1B4B43]/25 bg-transparent px-3 py-2 text-sm placeholder:text-[#1B4B43]/40 focus:outline-2 focus:outline-[#C9704A]"
        />
        <div className="mt-5"><PermissionChecks value={perms} onChange={setPerms} /></div>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={add}
            disabled={!email.includes("@") || pending}
            className="rounded-lg bg-[#C9704A] px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {pending ? s.adding : s.addButton}
          </button>
          {msg && <span role="status" className="text-xs text-[#1B4B43]/70">{msg}</span>}
        </div>
      </section>
    </div>
  );
}
