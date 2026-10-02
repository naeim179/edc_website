import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import ConversationList from "@/components/chat/ConversationList";
import { getConversationsForUser } from "@/lib/chat";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role =
    await getUserRole();

  if (
    role !== "student" &&
    role !== "teacher"
  ) {
    redirect("/");
  }

  const conversations =
    await getConversationsForUser(
      supabase,
      user.id,
      role
    );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-0 py-2 sm:px-6 sm:py-6 lg:px-8">
        <ConversationList
          initialConversations={
            conversations
          }
          userId={user.id}
          role={role}
        />
      </div>
    </AppShell>
  );
}
