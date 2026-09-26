"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ConversationListItem } from "@/lib/chat";

interface Props {
  initialConversations: ConversationListItem[];
  userId: string;
  role: "student" | "teacher" | "admin";
}

export default function ConversationList({
  initialConversations,
  userId,
  role,
}: Props) {
  const [conversations, setConversations] = useState(initialConversations);

  useEffect(() => {
    if (role === "admin") return; // الأدمن ما بيحتاج realtime على اللستة حاليًا

    const supabase = createClient();
    const column = role === "student" ? "student_id" : "teacher_id";

    const channel = supabase
      .channel(`conversations-list-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `${column}=eq.${userId}`,
        },
        (payload) => {
          setConversations((prev) => {
            const updated = payload.new as Partial<ConversationListItem> & {
              student_unread_count?: number;
              teacher_unread_count?: number;
            };
            const exists = prev.some((c) => c.id === updated.id);
            if (!exists) return prev; // محادثة جديدة كليًا - بتحتاج refresh من السيرفر لجلب أسماء
            return prev
              .map((c) =>
                c.id === updated.id
                  ? {
                      ...c,
                      last_message_at: updated.last_message_at ?? null,
                      last_message_preview: updated.last_message_preview ?? null,
                      unread_count:
                        role === "student"
                          ? updated.student_unread_count ?? 0
                          : updated.teacher_unread_count ?? 0,
                    }
                  : c
              )
              .sort(
                (a, b) =>
                  new Date(b.last_message_at ?? 0).getTime() -
                  new Date(a.last_message_at ?? 0).getTime()
              );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role]);

  if (conversations.length === 0) {
    return <p className="text-slate-500 text-center py-8">لا يوجد محادثات حاليًا</p>;
  }

  return (
    <div className="divide-y" dir="rtl">
      {conversations.map((conv) => (
        <Link
          key={conv.id}
          href={`/messages/${conv.id}`}
          className="flex items-center justify-between py-4 px-2 hover:bg-slate-50"
        >
          <div>
            <p className="font-bold">{conv.other_party_name}</p>
            <p className="text-sm text-slate-500">{conv.course_title}</p>
            {conv.last_message_preview && (
              <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                {conv.last_message_preview}
              </p>
            )}
          </div>
          {conv.unread_count > 0 && (
            <span className="bg-[#087a54] text-white text-xs rounded-full h-6 min-w-6 flex items-center justify-center px-2">
              {conv.unread_count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
