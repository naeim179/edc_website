import AppShell from "@/components/AppShell";
import { getAdminOrders } from "@/app/actions/admin-orders";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto w-full space-y-6">

        <div className="bg-white rounded-2xl border p-6 text-right">
          <h1 className="text-2xl font-bold">
            الطلبات
          </h1>

          <p className="text-slate-500 mt-2">
            متابعة عمليات الشراء
          </p>
        </div>

        <div className="space-y-4">

          {orders.length > 0 ? (
            orders.map((order) => {

              const courseTitle =
                (order.courses as { title?: string } | null)?.title ??
                "دورة غير موجودة";

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border p-5 text-right"
                >
                  <h2 className="font-bold">
                    {courseTitle}
                  </h2>

                  <p className="text-sm text-slate-500 mt-2">
                    المبلغ: {order.amount} {order.currency}
                  </p>

                  <p className="text-sm mt-1">
                    الحالة: {order.status}
                  </p>

                </div>
              );
            })
          ) : (
            <div className="bg-white border rounded-xl p-6 text-right">
              لا توجد طلبات
            </div>
          )}

        </div>

      </div>
    </AppShell>
  );
}
