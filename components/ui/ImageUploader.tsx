"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  value?: string | null;
  onChange: (url: string) => void;
  folder: string;
  hidePreview?: boolean;
  label?: string;
  uploadingLabel?: string;
  deleteOldImage?: boolean;
}

export default function ImageUploader({
  value,
  onChange,
  folder,
  hidePreview = false,
  label = "Upload Image",
  uploadingLabel = "Uploading...",
  deleteOldImage = false,
}: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();

      const ext = file.name.split(".").pop();

      const path = `${folder}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(path, file);

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("images")
        .getPublicUrl(path);


      if (deleteOldImage && value) {
        const oldPath =
          value.split("/images/")[1];

        if (oldPath) {
          await supabase.storage
            .from("images")
            .remove([oldPath]);
        }
      }


      onChange(publicUrl);

    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {value && !hidePreview && (
        <img
          src={value}
          alt=""
          className="h-32 w-32 rounded-xl object-cover border"
        />
      )}

      <label className="relative inline-flex cursor-pointer items-center rounded-xl bg-[#087a54] px-4 py-2 text-white font-bold focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[var(--brand-ink)]">
        {uploading ? uploadingLabel : label}

        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
