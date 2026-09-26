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

  console.log("DEBUG user:", user?.id, user?.email);
  console.log("DEBUG conversationId param:", id);

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole();
  console.log("DEBUG role:", role);

  const { data: rawConversation, error: rawError } = await supabase
    .from("conversations")
    .select("id, student_id, teacher_id, course_id")
    .eq("id", id)
    .single();

  console.log("DEBUG rawConversation:", rawConversation);
  console.log("DEBUG rawError:", rawError);

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
      <div className="max-w-3xl mx-auto h-[calc(100vh-120px)] flex flex-col">
        <MessageThread
          conversationId={id}
          initialMessages={messages}
          currentUserId={user.id}
          readOnly={isAdmin && !isParticipant}
        />
      </div>
    </AppShell>
  );
}
