export type SearchValues = Record<string, string | string[] | undefined>;
export type ListFilters = {
  q: string;
  category: string;
  price: string;
  sort: string;
  status: string;
  type: string;
  page: number;
};
export type PageInfo = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export type CourseListRow = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  is_free: boolean;
  course_type: "group" | "private";
  is_published: boolean;
  created_at: string;
  discount_type: "fixed" | "percentage" | null;
  discount_value: number | null;
  delivery_type: "recorded" | "live";
  instructor: string | null;
  lesson_count: number;
  section_count?: number;
  enrollment_count?: number;
};
export type CourseListPage = PageInfo & {
  items: CourseListRow[];
  categories: string[];
  summary: {
    courses?: number;
    published?: number;
    draft?: number;
    students?: number;
    lessons?: number;
  };
};
export type OrderListRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  user_id: string;
  course_id: string;
  created_at: string;
  payment_method: string | null;
  payment_proof: string | null;
  studentName: string;
  courses: { title: string }[];
};
export type OrdersPage = PageInfo & { items: OrderListRow[] };

export function listFilters(params: SearchValues): ListFilters {
  const value = (key: string, fallback: string) => {
    const raw = params[key];
    return (
      (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 120) || fallback
    );
  };
  const page = value("page", "1");
  return {
    q: value("q", ""),
    category: value("category", ""),
    price: value("price", "all"),
    sort: value("sort", "latest"),
    status: value("status", "all"),
    type: value("type", "all"),
    page: /^\d+$/.test(page) ? Math.min(100000, Math.max(1, Number(page))) : 1,
  };
}

export function pageHref(
  pathname: string,
  query: Record<string, string>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value) params.set(key, value);
  if (page > 1) params.set("page", String(page));
  return pathname + (params.size ? `?${params}` : "") + "#list-results";
}
