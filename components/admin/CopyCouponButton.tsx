"use client";

import { useState } from "react";

export default function CopyCouponButton({
  code,
}: {
  code: string;
}) {

  const [copied, setCopied] = useState(false);


  async function copy() {
    await navigator.clipboard.writeText(code);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }


  return (
    <button
      onClick={copy}
      className="bg-slate-100 px-3 py-1 rounded-lg text-sm font-bold"
    >
      {copied ? "✓" : "📋"}
    </button>
  );
}
