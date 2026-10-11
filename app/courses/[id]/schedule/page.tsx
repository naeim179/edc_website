import {
  notFound,
  redirect,
} from "next/navigation";

import AppShell from "@/components/AppShell";

import PrivateSchedulePicker from "@/components/booking/PrivateSchedulePicker";

import PrivateScheduleBlocked from "@/components/booking/PrivateScheduleBlocked";

import {
  createClient,
} from "@/lib/supabase/server";

export default async function PrivateSchedulePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id,
  } =
    await params;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: course,
    error:
      courseError,
  } =
    await supabase
      .from("courses")
      .select(`
        id,
        title,
        course_type,
        registration_open,
        is_published
      `)
      .eq(
        "id",
        id
      )
      .eq(
        "is_published",
        true
      )
      .maybeSingle();

  if (
    courseError ||
    !course ||
    course.course_type !==
      "private"
  ) {
    return notFound();
  }

  const {
    data:
      enrollment,
  } =
    await supabase
      .from(
        "enrollments"
      )
      .select("id")
      .eq(
        "student_id",
        user.id
      )
      .eq(
        "course_id",
        id
      )
      .maybeSingle();

  if (enrollment) {
    redirect(
      `/courses/${id}`
    );
  }

  const {
    data:
      registrationStateData,
  } =
    await supabase.rpc(
      "course_registration_state",
      {
        p_course_id:
          id,
      }
    );

  const registrationState =
    String(
      registrationStateData ??
        "unavailable"
    );

  const now =
    new Date()
      .toISOString();

  const {
    data:
      ownBooking,
  } =
    await supabase
      .from(
        "private_course_bookings"
      )
      .select(`
        id,
        hold_expires_at
      `)
      .eq(
        "course_id",
        id
      )
      .eq(
        "student_id",
        user.id
      )
      .eq(
        "status",
        "pending_payment"
      )
      .gt(
        "hold_expires_at",
        now
      )
      .maybeSingle();

  const blocked =
    !course.registration_open ||
    registrationState ===
      "booked" ||
    (
      registrationState ===
        "held" &&
      !ownBooking
    );

  if (blocked) {
    const reason =
      !course.registration_open
        ? "closed"
        : registrationState ===
            "booked"
          ? "booked"
          : registrationState ===
                "held" &&
              !ownBooking
            ? "held"
            : "unavailable";

    return (
      <AppShell>
        <PrivateScheduleBlocked
          courseId={
            id
          }
          reason={
            reason
          }
        />
      </AppShell>
    );
  }

  const {
    data: slots,
    error:
      slotsError,
  } =
    await supabase
      .from(
        "private_course_availability"
      )
      .select(`
        id,
        day_of_week,
        start_time,
        end_time
      `)
      .eq(
        "course_id",
        id
      )
      .eq(
        "is_active",
        true
      )
      .order(
        "day_of_week",
        {
          ascending:
            true,
        }
      )
      .order(
        "start_time",
        {
          ascending:
            true,
        }
      );

  if (slotsError) {
    throw new Error(
      slotsError.message
    );
  }

  let initialSelectedIds:
    string[] = [];

  if (ownBooking) {
    const {
      data:
        selectedRows,
    } =
      await supabase
        .from(
          "private_booking_slots"
        )
        .select(
          "availability_slot_id"
        )
        .eq(
          "booking_id",
          ownBooking.id
        );

    initialSelectedIds =
      (
        selectedRows ??
        []
      )
        .map(
          (row) =>
            row.availability_slot_id
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        );
  }

  return (
    <AppShell>
      <PrivateSchedulePicker
        courseId={
          id
        }
        courseTitle={
          course.title
        }
        slots={
          slots ?? []
        }
        initialSelectedIds={
          initialSelectedIds
        }
        existingBookingId={
          ownBooking?.id ??
          null
        }
        existingHoldExpiresAt={
          ownBooking?.hold_expires_at ??
          null
        }
      />
    </AppShell>
  );
}
