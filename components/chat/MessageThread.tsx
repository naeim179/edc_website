"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, markConversationRead } from "@/app/actions/chat";
import type { ChatMessage } from "@/lib/chat";

interface Props {
  conversationId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
  readOnly?: boolean;
}

export default function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
  readOnly = false,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!readOnly) {
      markConversationRead(conversationId);
    }
  }, [conversationId, readOnly]);

  useEffect(() => {
    const supabase = createClient();

    console.log("SUBSCRIBING REALTIME FOR:", conversationId);

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log(
            "REALTIME INSERT received:",
            JSON.stringify(payload.new, null, 2)
          );
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          if (!readOnly && newMessage.sender_id !== currentUserId) {
            markConversationRead(conversationId);
          }
        }
      )
      .subscribe((status) => {
        console.log("REALTIME channel status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, readOnly]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setDraft("");
    startTransition(async () => {
      try {
        await sendMessage(conversationId, content);
      } catch (err) {
        console.error(err);
        setDraft(content);
      }
    });
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isOwn
                    ? "bg-[#087a54] text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    isOwn ? "text-white/70" : "text-slate-400"
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString("ar", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {readOnly ? (
        <div className="p-4 border-t text-center text-sm text-slate-400">
          عرض فقط — الأدمن لا يمكنه إرسال رسائل بهذه المحادثة
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="flex-1 border rounded-full px-4 py-2 outline-none focus:border-[#087a54]"
            maxLength={4000}
          />
          <button
            type="submit"
            disabled={isPending || !draft.trim()}
            className="bg-[#087a54] text-white px-5 py-2 rounded-full font-bold disabled:opacity-50"
          >
            إرسال
          </button>
        </form>
      )}
    </div>
  );
}
