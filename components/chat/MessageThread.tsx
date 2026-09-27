"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  sendMessage,
  markConversationRead,
  editMessage,
  deleteMessage,
} from "@/app/actions/chat";
import type { ChatMessage } from "@/lib/chat";

interface Props {
  conversationId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;

  conversation: {
    student_id: string;
    teacher_id: string;

    course?: {
      title: string | null;
    }[] | null;

    student?: {
      full_name: string | null;
      avatar_url: string | null;
    }[] | null;

    teacher?: {
      full_name: string | null;
      avatar_url: string | null;
    }[] | null;
  };

  readOnly?: boolean;
}

export default function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
  conversation,
  readOnly = false,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const [otherOnline, setOtherOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

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

  async function updatePresence() {
    const supabase = createClient();

    await supabase
      .from("user_presence")
      .upsert({
        user_id: currentUserId,
        last_seen: new Date().toISOString(),
      });
  }


  async function checkOtherPresence() {
    const supabase = createClient();

    const otherId =
      conversation.student_id === currentUserId
        ? conversation.teacher_id
        : conversation.student_id;

    const { data } = await supabase
      .from("user_presence")
      .select("last_seen")
      .eq("user_id", otherId)
      .single();

    if (data?.last_seen) {
      const diff =
        Date.now() - new Date(data.last_seen).getTime();

      setOtherOnline(diff < 120000);
    }
  }


  async function refreshMessages() {
    const supabase = createClient();

    const { data } = await supabase
      .from("messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        created_at,
        read_at,
        message_type,
        attachment_url,
        attachment_name,
        attachment_size,
        edited_at,
        deleted_at
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as ChatMessage[]);
    }
  }


  useEffect(() => {
    updatePresence();
    checkOtherPresence();

    const timer = setInterval(() => {
      updatePresence();
      checkOtherPresence();
    }, 30000);

    return () => {
      clearInterval(timer);
    };
  }, [currentUserId, conversation]);


  useEffect(() => {
    const supabase = createClient();

    console.log("SUBSCRIBING REALTIME FOR:", conversationId);

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "broadcast",
        {
          event: "typing",
        },
        (payload) => {
          if (payload.payload.user_id !== currentUserId) {
            setIsTyping(payload.payload.typing);

            if (payload.payload.typing) {
              setTimeout(() => {
                setIsTyping(false);
              }, 2000);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const payloadMessage = payload.new as Partial<ChatMessage>;

          if (
            payloadMessage.conversation_id &&
            payloadMessage.conversation_id !== conversationId
          ) {
            return;
          }

          console.log("REALTIME EVENT:", payload.eventType);

          await refreshMessages();

          const newMessage = payload.new as ChatMessage;

          if (
            !readOnly &&
            newMessage?.sender_id &&
            newMessage.sender_id !== currentUserId
          ) {
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

  async function uploadFile(file: File) {
    const supabase = createClient();

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("الملف أكبر من 10MB");
    }

    const filePath = `${conversationId}/${crypto.randomUUID()}-${file.name}`;

    const { error } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data, error: signedError } = await supabase.storage
      .from("chat-files")
      .createSignedUrl(filePath, 60 * 60);

    if (signedError) {
      throw signedError;
    }

    return {
      url: data.signedUrl,
      name: file.name,
      size: file.size,
      type: file.type.startsWith("image/")
        ? "image" as const
        : "file" as const,
    };
  }


  function handleTyping(value: string) {
    setDraft(value);

    const supabase = createClient();

    supabase
      .channel(`messages-${conversationId}`)
      .send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: currentUserId,
          typing: value.trim().length > 0,
        },
      });
  }


  function handleSend(e: React.FormEvent) {
    e.preventDefault();

    const content = draft.trim();

    if (!content && !selectedFile) return;

    setDraft("");

    startTransition(async () => {
      try {
        let attachment;

        if (selectedFile) {
          attachment = await uploadFile(selectedFile);
        }

        await sendMessage(
          conversationId,
          content,
          attachment
        );

        setSelectedFile(null);

      } catch (err) {
        console.error(err);
        setDraft(content);
      }
    });
  }

  const otherUser =
    conversation.student?.[0]?.full_name &&
    conversation.student?.[0]?.full_name !== null &&
    conversation.student?.[0]?.full_name !== undefined &&
    conversation.student?.[0]
      ? conversation.student[0]
      : conversation.teacher?.[0];

  const courseTitle = conversation.course?.[0]?.title ?? "";

  return (
    <div className="flex flex-col h-full rounded-2xl border bg-white overflow-hidden" dir="rtl">

      <div className="flex items-center gap-3 border-b bg-white p-4">
        <div className="h-12 w-12 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl">👤</span>
          )}
        </div>

        <div>
          <h2 className="font-bold text-slate-800">
            {otherUser?.full_name ?? "مستخدم"}
          </h2>

          <p
            className={`text-xs ${
              isTyping
                ? "text-blue-600"
                : otherOnline
                ? "text-emerald-600"
                : "text-slate-400"
            }`}
          >
            {isTyping
              ? "✍️ يكتب..."
              : otherOnline
              ? "🟢 متصل الآن"
              : "⚪ غير متصل"}
          </p>

          {courseTitle && (
            <p className="text-xs text-slate-400">
              {courseTitle}
            </p>
          )}
        </div>
      </div>

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
                <p
                  className={`mb-1 text-[11px] font-bold ${
                    isOwn
                      ? "text-white/80"
                      : "text-slate-500"
                  }`}
                >
                  {isOwn
                    ? "أنت"
                    : otherUser?.full_name ?? "المستخدم"}
                </p>
                {msg.deleted_at ? (
                  <p className="italic text-slate-400">
                    🚫 تم حذف هذه الرسالة
                  </p>
                ) : (
                  <>
                    {msg.content && msg.content.trim() && (
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}

                    {msg.attachment_url && msg.message_type === "image" && (
                      <img
                        src={msg.attachment_url}
                        alt={msg.attachment_name ?? "image"}
                        className="mt-2 max-w-xs rounded-xl"
                      />
                    )}

                    {msg.attachment_url && msg.message_type === "file" && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        className="mt-2 block rounded-xl bg-white/20 px-3 py-2 underline"
                      >
                        📄 {msg.attachment_name ?? "تحميل الملف"}
                      </a>
                    )}

                    {isOwn && (
                      <div className="mt-2 flex gap-3 text-xs">
                        <button
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditingText(msg.content);
                          }}
                          className="underline"
                        >
                          ✏️ تعديل
                        </button>

                        <button
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "هل تريد حذف هذه الرسالة؟"
                            );

                            if (!confirmed) return;

                            await deleteMessage(msg.id);
                          }}
                          className="underline"
                        >
                          🗑 حذف
                        </button>
                      </div>
                    )}
                  </>
                )}

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
        <form
          onSubmit={handleSend}
          className="sticky bottom-0 bg-white p-4 border-t flex gap-2 items-center"
        >

          <label className="cursor-pointer text-xl">
            📎
            <input
              type="file"
              className="hidden"
              onChange={(e) =>
                setSelectedFile(e.target.files?.[0] ?? null)
              }
              accept="image/*,.pdf,.doc,.docx,.zip"
            />
          </label>

          <div className="flex-1">
            {selectedFile && (
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-100 p-2">

                {selectedFile.type.startsWith("image/") && (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="preview"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs text-slate-600">
                    📄 {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-red-500 text-sm font-bold"
                >
                  ✕
                </button>

              </div>
            )}

            <input
              value={draft}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="w-full border rounded-full px-4 py-2 outline-none focus:border-[#087a54]"
              maxLength={4000}
            />
          </div>

          <button
            type="submit"
            disabled={isPending || (!draft.trim() && !selectedFile)}
            className="bg-[#087a54] text-white px-5 py-2 rounded-full font-bold disabled:opacity-50"
          >
            إرسال
          </button>

        </form>
      )}
    </div>
  );
}
