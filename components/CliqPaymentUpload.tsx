"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadPaymentProof } from "@/app/actions/payment-proof";

export default function CliqPaymentUpload({
  orderId,
}: {
  orderId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function upload() {
    if (!file) return;

    setLoading(true);

    const supabase = createClient();

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No user");
    }

    const path =
      `${user.id}/${Date.now()}-${file.name}`;

    const { error } =
      await supabase.storage
        .from("payment-proofs")
        .upload(path, file);

    if (error) {
      throw new Error(error.message);
    }

    await uploadPaymentProof(
      orderId,
      path
    );

    setDone(true);
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
      <h3 className="font-bold">
        رفع إثبات تحويل CliQ
      </h3>

      <input
        className="mt-4"
        type="file"
        accept="image/*"
        onChange={(e) =>
          setFile(
            e.target.files?.[0] ?? null
          )
        }
      />

      <button
        type="button"
        onClick={upload}
        disabled={!file || loading}
        className="mt-4 rounded-xl bg-[var(--brand-ink)] px-5 py-3 text-white font-bold disabled:opacity-50"
      >
        {loading
          ? "جاري الرفع..."
          : "إرسال الإثبات"}
      </button>

      {done && (
        <p className="mt-3 text-sm text-green-700">
          تم إرسال الإثبات بنجاح، بانتظار المراجعة.
        </p>
      )}
    </div>
  );
}
