"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/profile";

export default function ProfileForm({
  profile,
}: {
  profile: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}) {
  const [avatarUrl, setAvatarUrl] = useState(
    profile.avatar_url ?? ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      await updateProfile(formData);
      setMessage("تم حفظ التغييرات بنجاح");
    } catch {
      setError("حدث خطأ أثناء حفظ التغييرات");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1554A3]/20 focus:border-[#1554A3]/40 transition disabled:opacity-60";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 text-right"
      dir="rtl"
    >

      <div className="grid md:grid-cols-2 gap-5">

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            الاسم
          </label>

          <input
            name="full_name"
            defaultValue={profile.full_name ?? ""}
            placeholder="اكتب اسمك"
            disabled={isSaving}
            className={inputClass}
          />
        </div>


        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            رقم الهاتف
          </label>

          <input
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
            placeholder="رقم الهاتف"
            disabled={isSaving}
            className={inputClass}
          />
        </div>

      </div>


      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          رابط الصورة الشخصية
        </label>

        <input
          name="avatar_url"
          type="url"
          value={avatarUrl}
          onChange={(event) =>
            setAvatarUrl(event.target.value)
          }
          placeholder="https://..."
          disabled={isSaving}
          dir="ltr"
          className={inputClass}
        />


        {avatarUrl.trim() && (
          <div className="mt-5 flex items-center justify-end gap-4">

            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">
                معاينة الصورة
              </p>

              <p className="text-xs text-slate-400 mt-1">
                ستظهر هذه الصورة في ملفك الشخصي
              </p>
            </div>

            <img
              src={avatarUrl}
              alt="معاينة الصورة الشخصية"
              className="w-16 h-16 rounded-full object-cover border-4 border-blue-50"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />

          </div>
        )}

      </div>


      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 text-sm font-medium">
          {message}
        </div>
      )}


      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}


      <div className="flex justify-end pt-2">

        <button
          type="submit"
          disabled={isSaving}
          className="bg-[#1554A3] hover:bg-[#10427d] text-white px-7 py-3 rounded-xl font-bold transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving
            ? "جاري حفظ التغييرات..."
            : "حفظ التغييرات"}
        </button>

      </div>

    </form>
  );
}
