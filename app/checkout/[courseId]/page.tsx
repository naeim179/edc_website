import {
  notFound,
  redirect,
} from "next/navigation";

import AppShell from "@/components/AppShell";
import SubscriptionCheckout from "@/components/SubscriptionCheckout";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  calculateFinalPrice,
} from "@/lib/free-enrollment";

type BookingSlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{
    courseId: string;
  }>;

  searchParams: Promise<{
    booking?: string;
  }>;
}) {
  const {
    courseId,
  } = await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: course,
    error,
  } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      price,
      is_free,
      discount_type,
      discount_value,
      course_type,
      registration_open,
      group_day_of_week,
      group_start_time,
      group_end_time
    `)
    .eq(
      "id",
      courseId
    )
    .eq(
      "is_published",
      true
    )
    .maybeSingle();

  if (
    error ||
    !course
  ) {
    return notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: enrollment,
  } = await supabase
    .from("enrollments")
    .select("id")
    .eq(
      "student_id",
      user.id
    )
    .eq(
      "course_id",
      courseId
    )
    .maybeSingle();

  const isRenewal =
    Boolean(enrollment);

  if (
    !isRenewal &&
    !course.registration_open
  ) {
    redirect(
      `/courses/${courseId}`
    );
  }

  let privateBookingId:
    string | null = null;

  let privateHoldExpiresAt:
    string | null = null;

  let bookingSlots:
    BookingSlot[] = [];

  if (
    course.course_type ===
      "private" &&
    !isRenewal
  ) {
    const bookingId =
      query.booking ??
      "";

    if (!bookingId) {
      redirect(
        `/courses/${courseId}/schedule`
      );
    }

    const {
      data: booking,
      error:
        bookingError,
    } = await supabase
      .from(
        "private_course_bookings"
      )
      .select(`
        id,
        course_id,
        student_id,
        status,
        hold_expires_at
      `)
      .eq(
        "id",
        bookingId
      )
      .eq(
        "course_id",
        courseId
      )
      .eq(
        "student_id",
        user.id
      )
      .maybeSingle();

    if (
      bookingError ||
      !booking ||
      booking.status !==
        "pending_payment" ||
      !booking.hold_expires_at ||
      new Date(
        booking.hold_expires_at
      ).getTime() <=
        // The private-booking hold must be checked against request time.
        // eslint-disable-next-line react-hooks/purity
        Date.now()
    ) {
      redirect(
        `/courses/${courseId}/schedule`
      );
    }

    privateBookingId =
      booking.id;

    privateHoldExpiresAt =
      booking.hold_expires_at;

    const {
      data: slotRows,
      error:
        slotError,
    } = await supabase
      .from(
        "private_booking_slots"
      )
      .select(`
        day_of_week,
        start_time,
        end_time
      `)
      .eq(
        "booking_id",
        booking.id
      )
      .order(
        "day_of_week",
        {
          ascending: true,
        }
      )
      .order(
        "start_time",
        {
          ascending: true,
        }
      );

    if (slotError) {
      throw new Error(
        slotError.message
      );
    }

    bookingSlots =
      slotRows ?? [];

    if (
      bookingSlots.length !== 2
    ) {
      redirect(
        `/courses/${courseId}/schedule`
      );
    }
  }

  const monthlyPriceUsd =
    calculateFinalPrice(
      Number(
        course.price ?? 0
      ),
      course.discount_type,
      Number(
        course.discount_value ??
          0
      )
    );

  return (
    <AppShell>
      <SubscriptionCheckout
        courseId={
          course.id
        }
        title={
          course.title
        }
        monthlyPriceUsd={
          monthlyPriceUsd
        }
        courseType={
          course.course_type ===
          "private"
            ? "private"
            : "group"
        }
        isRenewal={
          isRenewal
        }
        registrationOpen={
          Boolean(
            course.registration_open
          )
        }
        groupDayOfWeek={
          course.group_day_of_week
        }
        groupStartTime={
          course.group_start_time
        }
        groupEndTime={
          course.group_end_time
        }
        privateBookingId={
          privateBookingId
        }
        privateHoldExpiresAt={
          privateHoldExpiresAt
        }
        bookingSlots={
          bookingSlots
        }
      />
    </AppShell>
  );
}
