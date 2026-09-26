"use client";

import Image from "next/image";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function AuthLayout({
  title,
  description,
  children,
}: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b1f3a] via-[#124b8a] to-[#d6b56c] p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md p-8">

        <div className="mb-10 text-center">

          <div className="relative mx-auto mb-8 flex h-44 w-44 items-center justify-center rounded-full bg-white/90 shadow-[0_15px_40px_rgba(0,0,0,0.18)]">

            <Image
              src="/logo/logo.png"
              alt="Your Way"
              width={150}
              height={150}
              priority
              className="object-contain rounded-full"
            />

          </div>


          <h1 className="text-2xl font-bold text-white">
            {title}
          </h1>


          <p className="mt-2 text-sm text-white/70">
            {description}
          </p>

        </div>


        {children}

      </div>
    </div>
  );
}
