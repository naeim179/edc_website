import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import AdminStudentsContent from "@/components/AdminStudentsContent";
import { requirePermission } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type StudentStatus =
  | "all"
  | "active"
  | "expired"
  | "no_courses";

type StudentRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;

  enrollments_count: number;
  active_courses_count: number;
  expired_courses_count: number;

  student_state:
    | "active"
    | "expired"
    | "no_courses";

  total_count: number;
};

type SearchParams = {
  q?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

function firstValue(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("manage_students");

  const params =
    await searchParams;

  const query =
    (
      firstValue(params.q) ??
      ""
    )
      .trim()
      .slice(0, 120);

  const rawStatus =
    firstValue(params.status) ??
    "all";

  const allowedStatuses: StudentStatus[] = [
    "all",
    "active",
    "expired",
    "no_courses",
  ];

  const status: StudentStatus =
    allowedStatuses.includes(
      rawStatus as StudentStatus
    )
      ? rawStatus as StudentStatus
      : "all";

  const rawPage =
    Number.parseInt(
      firstValue(params.page) ??
        "1",
      10
    );

  const page =
    Number.isFinite(rawPage) &&
    rawPage > 0
      ? rawPage
      : 1;

  const PAGE_SIZE = 20;

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin.rpc(
    "admin_list_students",
    {
      p_search:
        query || null,

      p_filter:
        status,

      p_page:
        page,

      p_page_size:
        PAGE_SIZE,
    }
  );

  if (error) {
    throw new Error(
      `Failed to load students: ${error.message}`
    );
  }

  const students =
    (
      data ??
      []
    ) as StudentRow[];

  if (
    students.length === 0 &&
    page > 1
  ) {
    const next =
      new URLSearchParams();

    if (query) {
      next.set(
        "q",
        query
      );
    }

    if (status !== "all") {
      next.set(
        "status",
        status
      );
    }

    const queryString =
      next.toString();

    redirect(
      `/admin/students${
        queryString
          ? `?${queryString}`
          : ""
      }`
    );
  }

  const totalCount =
    Number(
      students[0]
        ?.total_count ??
        0
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCount /
          PAGE_SIZE
      )
    );

  return (
    <AppShell>
      <AdminStudentsContent
        students={students}
        query={query}
        status={status}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </AppShell>
  );
}
