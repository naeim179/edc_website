import { redirect } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { getAllConversationsForAdmin } from "@/lib/chat";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMessagesPage() {
  const role = await getUserRole();

  if (role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const conversations = await getAllConversationsForAdmin(supabase);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6" dir="rtl">
        <h1 className="text-2xl font-bold mb-6">كل المحادثات (عرض فقط)</h1>
        <div className="divide-y">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="block py-4 hover:bg-slate-50 px-2"
            >
              <p className="font-bold">{conv.other_party_name}</p>
              <p className="text-sm text-slate-500">{conv.course_title}</p>
              {conv.last_message_preview && (
                <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                  {conv.last_message_preview}
                </p>
              )}
            </Link>
          ))}
          {conversations.length === 0 && (
            <p className="text-slate-500 py-8 text-center">لا يوجد محادثات بعد</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
