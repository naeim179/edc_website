import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ConversationList from "@/components/chat/ConversationList";
import { getConversationsForUser } from "@/lib/chat";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole();

  if (role !== "student" && role !== "teacher") {
    redirect("/");
  }

  const conversations = await getConversationsForUser(supabase, user.id, role);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6" dir="rtl">
        <h1 className="text-2xl font-bold mb-6">الرسائل</h1>
        <ConversationList
          initialConversations={conversations}
          userId={user.id}
          role={role}
        />
      </div>
    </AppShell>
  );
}
