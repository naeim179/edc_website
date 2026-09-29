import Link from "next/link";

export default function HeroBanner() {
  return (
    <section className="relative w-full rounded-[20px] p-6 text-white overflow-hidden  shadow-lg">
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Right Side: Welcome Text & CTA */}
        <div className="flex flex-col items-start text-right space-y-3 max-w-lg">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span>👋</span>
            <span>مرحباً بعودتك يا خالد</span>
          </h2>

          <p className="text-[var(--brand-text-muted)] text-sm md:text-base font-medium">
            أنت في الصف الثاني الثانوي
          </p>

          <p className="text-[var(--brand-text-faint)] text-xs md:text-sm">
            استمر في التعلم اليوم، كل خطوة تقربك من هدفك.
          </p>

          <Link
            href="/my-courses"
            className="mt-2 px-6 py-2.5 rounded-xl bg-[var(--brand-ink-hover)] text-white font-bold text-sm hover:opacity-90 transition-all shadow-md"
          >
            متابعة التعلم
          </Link>
        </div>

        {/* Left Side: Stats */}
        <div className="flex items-center gap-4 dir-rtl">
          <div className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm">
            <span className="text-lg md:text-xl font-bold text-white">
              1,250
            </span>
            <span className="text-[10px] md:text-xs text-[var(--brand-text-muted)]">
              نقاط الإنجاز XP
            </span>
          </div>

          <div className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm">
            <span className="text-lg md:text-xl font-bold text-white">
              42
            </span>
            <span className="text-[10px] md:text-xs text-[var(--brand-text-muted)]">
              ساعات التعلم هذا الأسبوع
            </span>
          </div>

          <div className="flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm">
            <span className="text-lg md:text-xl font-bold text-white">
              5
            </span>
            <span className="text-[10px] md:text-xs text-[var(--brand-text-muted)]">
              سلسلة الانتظام أيام متتالية
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
