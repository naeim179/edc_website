import AppShell from "@/components/AppShell";
import AdminOrdersContent from "@/components/AdminOrdersContent";
import { getAdminOrdersPage } from "@/app/actions/admin-orders";
import { listFilters, type SearchValues } from "@/lib/list-pages";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  const filters = listFilters(await searchParams);
  const data = await getAdminOrdersPage(filters);
  return (
    <AppShell>
      <AdminOrdersContent
        orders={data.items}
        pageInfo={data}
        filters={filters}
        canReview={data.canReview}
      />
    </AppShell>
  );
}
