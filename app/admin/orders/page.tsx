import AppShell from "@/components/AppShell";
import AdminOrdersContent from "@/components/AdminOrdersContent";
import { getAdminOrders } from "@/app/actions/admin-orders";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  return (
    <AppShell>
      <AdminOrdersContent
        orders={orders ?? []}
      />
    </AppShell>
  );
}
