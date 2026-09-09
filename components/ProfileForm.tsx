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
  return (
    <form
      action={updateProfile}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 text-right"
    >
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          الاسم
        </label>

        <input
          name="full_name"
          defaultValue={profile.full_name ?? ""}
          placeholder="اكتب اسمك"
          className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#087a54]/20"
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
          className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#087a54]/20"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          رابط الصورة الشخصية
        </label>

        <input
          name="avatar_url"
          type="url"
          defaultValue={profile.avatar_url ?? ""}
          placeholder="https://..."
          className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#087a54]/20"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-[#087a54] hover:bg-[#066b49] text-white px-6 py-3 rounded-xl font-bold transition"
        >
          حفظ التغييرات
        </button>
      </div>
    </form>
  );
}
