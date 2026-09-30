"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import CardContent from "@/components/ui/CardContent";
import { useLanguage } from "@/components/LanguageProvider";
import { updateUsername } from "@/app/actions/username";

const MESSAGES = {
  ar: {
    title: "اسم المستخدم",
    hint: "يمكنك استخدامه لتسجيل الدخول بدل البريد الإلكتروني.",
    placeholder: "username",
    save: "حفظ",
    saving: "جارٍ الحفظ...",
    edit: "تعديل",
    cancel: "إلغاء",
    success: "تم حفظ اسم المستخدم",
    invalid: "من 3 إلى 30 حرف: إنجليزي، أرقام، _ أو . فقط",
    reserved: "هذا الاسم محجوز، اختر اسماً آخر",
    taken: "اسم المستخدم مأخوذ، جرّب اسماً آخر",
    unauthenticated: "يجب تسجيل الدخول أولاً",
    failed: "تعذّر الحفظ، حاول مرة أخرى",
  },
  en: {
    title: "Username",
    hint: "You can use it to sign in instead of your email.",
    placeholder: "username",
    save: "Save",
    saving: "Saving...",
    edit: "Edit",
    cancel: "Cancel",
    success: "Username saved",
    invalid: "3-30 characters: English letters, numbers, _ or . only",
    reserved: "This name is reserved, choose another",
    taken: "Username is taken, try another",
    unauthenticated: "Please sign in first",
    failed: "Could not save, please try again",
  },
} as const;

export default function UsernameCard({
  initialUsername,
}: {
  initialUsername: string | null;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const m = MESSAGES[language === "ar" ? "ar" : "en"];

  const [saved, setSaved] = useState(initialUsername ?? "");
  const [value, setValue] = useState(initialUsername ?? "");
  const [editing, setEditing] = useState(!initialUsername);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const next = value.trim();
    setMessage(null);

    if (!/^[A-Za-z0-9_.]{3,30}$/.test(next)) {
      setMessage({ type: "error", text: m.invalid });
      return;
    }
    if (next === saved) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const res = await updateUsername(next);
      if (res.error) {
        setMessage({ type: "error", text: m[res.error] });
        return;
      }
      setSaved(next);
      setValue(next);
      setEditing(false);
      setMessage({ type: "success", text: m.success });
      router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#124b8a]/10 text-lg font-bold text-[#124b8a]">
            @
          </div>
          <h3 className="text-lg font-bold text-slate-800">{m.title}</h3>
        </div>

        <p className="mb-4 text-sm text-slate-500">{m.hint}</p>

        {editing ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              dir="ltr"
              autoCapitalize="none"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
              placeholder={m.placeholder}
              disabled={pending}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#124b8a]/30 disabled:opacity-50"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="rounded-xl bg-[#124b8a] px-5 py-2.5 font-bold text-white transition hover:bg-[#0d3b6e] disabled:opacity-50"
              >
                {pending ? m.saving : m.save}
              </button>
              {saved && (
                <button
                  type="button"
                  onClick={() => {
                    setValue(saved);
                    setEditing(false);
                    setMessage(null);
                  }}
                  disabled={pending}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  {m.cancel}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-800" dir="ltr">
              @{saved}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setMessage(null);
              }}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-bold text-[#124b8a] transition-colors hover:bg-[#124b8a] hover:text-white"
            >
              {m.edit}
            </button>
          </div>
        )}

        {message && (
          <p
            className={`mt-3 text-sm ${
              message.type === "error" ? "text-red-500" : "text-green-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
