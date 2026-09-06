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
      className="bg-white rounded-2xl border p-6 space-y-4 text-right"
    >
      <input
        name="full_name"
        defaultValue={profile.full_name ?? ""}
        placeholder="الاسم"
        className="w-full border rounded-lg p-3"
      />

      <input
        name="phone"
        defaultValue={profile.phone ?? ""}
        placeholder="رقم الهاتف"
        className="w-full border rounded-lg p-3"
      />

      <input
        name="avatar_url"
        defaultValue={profile.avatar_url ?? ""}
        placeholder="رابط الصورة"
        className="w-full border rounded-lg p-3"
      />

      <button className="bg-[#087a54] text-white px-5 py-3 rounded-lg">
        حفظ
      </button>
    </form>
  );
}
