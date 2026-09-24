"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/profile";

export default function ProfileForm({
  profile,
}: {
  profile: {
    full_name: string | null;
    phone: string | null;
  };
}) {

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);


  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setIsSaving(true);
    setMessage(null);
    setError(null);


    const formData =
      new FormData(event.currentTarget);


    try {

      await updateProfile(formData);

      setMessage(
        "تم تحديث بياناتك بنجاح ✅"
      );

    } catch {

      setError(
        "حدث خطأ أثناء تحديث البيانات"
      );

    } finally {

      setIsSaving(false);

    }

  }



  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#124b8a]/20 focus:border-[#124b8a]/40 transition";



  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      dir="rtl"
    >


      <div className="grid md:grid-cols-2 gap-5">


        <div>

          <label className="block text-sm font-bold text-slate-700 mb-2">
            الاسم الكامل
          </label>


          <input
            name="full_name"
            defaultValue={
              profile.full_name ?? ""
            }
            placeholder="أدخل اسمك"
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
            defaultValue={
              profile.phone ?? ""
            }
            placeholder="07xxxxxxxx"
            disabled={isSaving}
            className={inputClass}
          />

        </div>


      </div>




      {message && (

        <div className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 px-5 py-3 text-sm font-bold">

          {message}

        </div>

      )}




      {error && (

        <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 px-5 py-3 text-sm font-bold">

          {error}

        </div>

      )}




      <div className="flex justify-end">


        <button
          type="submit"
          disabled={isSaving}
          className="
          bg-[#124b8a]
          hover:bg-[#0d3b6e]
          text-white
          px-8
          py-3
          rounded-xl
          font-bold
          transition
          shadow-sm
          disabled:opacity-60
          "
        >

          {isSaving
            ? "جاري الحفظ..."
            : "حفظ التغييرات"}

        </button>


      </div>


    </form>

  );

}
