import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import MessageThread from "@/components/chat/MessageThread";
import { getConversationById, getMessages } from "@/lib/chat";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole();

  const conversation = await getConversationById(supabase, id);

  if (!conversation) {
    notFound();
  }

  const isParticipant =
    conversation.student_id === user.id || conversation.teacher_id === user.id;
  const isAdmin = role === "admin";

  if (!isParticipant && !isAdmin) {
    redirect("/");
  }

  const messages = await getMessages(supabase, id);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col">
        <MessageThread
          conversationId={id}
          initialMessages={messages}
          currentUserId={user.id}
          conversation={conversation}
          readOnly={isAdmin && !isParticipant}
        />
      </div>
    </AppShell>
  );
}
