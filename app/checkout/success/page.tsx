import AppShell from "@/components/AppShell";

export default function CheckoutSuccessPage() {
  return (
    <AppShell>
      <div className="max-w-xl mx-auto bg-white rounded-2xl border p-8 text-right">

        <h1 className="text-2xl font-bold text-[#124b8a]">
          تم إرسال طلب الشراء ✅
        </h1>

        <p className="mt-4 text-slate-600 leading-7">
          تم تسجيل طلبك بنجاح.
          <br />
          سيتم مراجعة الدفع من الإدارة وتفعيل الدورة بعد التأكيد.
        </p>

      </div>
    </AppShell>
  );
}
