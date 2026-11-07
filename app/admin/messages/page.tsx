import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminInboxUpdates from "@/components/chat/AdminInboxUpdates";
import AppShell from "@/components/AppShell";
import { chatPreview, getAllConversationsForAdmin } from "@/lib/chat";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMessagesPage() {
  const language = (await cookies()).get("app-language")?.value === "en" ? "en" : "ar";
  const role = await getUserRole();

  if (role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const conversations = await getAllConversationsForAdmin(supabase);

  return (
    <AppShell>
      <AdminInboxUpdates />
      <div className="mx-auto max-w-4xl p-0 sm:p-6" dir={language === "ar" ? "rtl" : "ltr"}>
        <h1 className="text-2xl font-bold mb-6">{language === "ar" ? "كل المحادثات (عرض فقط)" : "All conversations (read only)"}</h1>
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
                  {chatPreview(conv.last_message_preview, language)}
                </p>
              )}
            </Link>
          ))}
          {conversations.length === 0 && (
            <p className="text-slate-500 py-8 text-center">{language === "ar" ? "لا يوجد محادثات بعد" : "No conversations yet"}</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
