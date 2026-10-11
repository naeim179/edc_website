"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/LanguageProvider";

type CourseType =
  | "group"
  | "private";

type PrivateSlot = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type DraftRange = {
  start: string;
  end: string;
};

type Props = {
  courseType: CourseType;
  initialRegistrationOpen?: boolean;
  initialGroupDay?: number | null;
  initialGroupTime?: string | null;
  initialGroupEndTime?: string | null;
  initialPrivateSlots?: PrivateSlot[];
};

function normalizeTime(
  value: string
) {
  return value.slice(0, 5);
}

function formatTime(
  value: string,
  isArabic: boolean
) {
  const clean =
    normalizeTime(value);

  const [
    hourText,
    minute = "00",
  ] = clean.split(":");

  const hour =
    Number(hourText);

  if (
    !Number.isFinite(hour)
  ) {
    return clean;
  }

  const suffix =
    hour >= 12
      ? isArabic
        ? "م"
        : "PM"
      : isArabic
        ? "ص"
        : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

export default function CourseSchedulingFields({
  courseType,
  initialRegistrationOpen = true,
  initialGroupDay = null,
  initialGroupTime = null,
  initialGroupEndTime = null,
  initialPrivateSlots = [],
}: Props) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  const copy =
    t.scheduling;

  const DAYS = [
    {
      value: 0,
      label: copy.sunday,
    },
    {
      value: 1,
      label: copy.monday,
    },
    {
      value: 2,
      label: copy.tuesday,
    },
    {
      value: 3,
      label: copy.wednesday,
    },
    {
      value: 4,
      label: copy.thursday,
    },
    {
      value: 5,
      label: copy.friday,
    },
    {
      value: 6,
      label: copy.saturday,
    },
  ];

  const [
    registrationOpen,
    setRegistrationOpen,
  ] = useState(
    initialRegistrationOpen
  );

  const [
    groupDay,
    setGroupDay,
  ] =
    useState<number | null>(
      initialGroupDay
    );

  const [
    groupTime,
    setGroupTime,
  ] = useState(
    initialGroupTime
      ? normalizeTime(
          initialGroupTime
        )
      : ""
  );

  const [
    groupEndTime,
    setGroupEndTime,
  ] = useState(
    initialGroupEndTime
      ? normalizeTime(
          initialGroupEndTime
        )
      : ""
  );

  const [
    privateSlots,
    setPrivateSlots,
  ] =
    useState<PrivateSlot[]>(
      initialPrivateSlots.map(
        (slot) => ({
          ...slot,
          start_time:
            normalizeTime(
              slot.start_time
            ),
          end_time:
            normalizeTime(
              slot.end_time
            ),
        })
      )
    );

  const [
    draftRanges,
    setDraftRanges,
  ] =
    useState<
      Record<
        number,
        DraftRange
      >
    >({});

  const orderedSlots =
    useMemo(
      () =>
        [...privateSlots].sort(
          (a, b) => {
            if (
              a.day_of_week !==
              b.day_of_week
            ) {
              return (
                a.day_of_week -
                b.day_of_week
              );
            }

            const startCompare =
              a.start_time.localeCompare(
                b.start_time
              );

            if (
              startCompare !==
              0
            ) {
              return startCompare;
            }

            return a.end_time.localeCompare(
              b.end_time
            );
          }
        ),
      [privateSlots]
    );

  function getDraft(
    day: number
  ): DraftRange {
    return (
      draftRanges[day] ?? {
        start: "",
        end: "",
      }
    );
  }

  function updateDraft(
    day: number,
    field:
      | "start"
      | "end",
    value: string
  ) {
    setDraftRanges(
      (current) => ({
        ...current,
        [day]: {
          ...(
            current[day] ?? {
              start: "",
              end: "",
            }
          ),
          [field]: value,
        },
      })
    );
  }

  function addPrivateSlot(
    day: number
  ) {
    const draft =
      getDraft(day);

    const start =
      normalizeTime(
        draft.start
      );

    const end =
      normalizeTime(
        draft.end
      );

    if (
      !start ||
      !end ||
      end <= start
    ) {
      return;
    }

    const exists =
      privateSlots.some(
        (slot) =>
          slot.day_of_week ===
            day &&
          normalizeTime(
            slot.start_time
          ) === start &&
          normalizeTime(
            slot.end_time
          ) === end
      );

    if (exists) {
      return;
    }

    setPrivateSlots(
      (current) => [
        ...current,
        {
          day_of_week:
            day,
          start_time:
            start,
          end_time:
            end,
        },
      ]
    );

    setDraftRanges(
      (current) => ({
        ...current,
        [day]: {
          start: "",
          end: "",
        },
      })
    );
  }

  function removePrivateSlot(
    day: number,
    start: string,
    end: string
  ) {
    setPrivateSlots(
      (current) =>
        current.filter(
          (slot) =>
            !(
              slot.day_of_week ===
                day &&
              normalizeTime(
                slot.start_time
              ) ===
                normalizeTime(
                  start
                ) &&
              normalizeTime(
                slot.end_time
              ) ===
                normalizeTime(
                  end
                )
            )
        )
    );
  }

  return (
    <section
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
      className="overflow-hidden rounded-[28px] border border-[#DDE6E1] bg-white shadow-[0_18px_50px_rgba(27,75,67,0.06)]"
    >
      <div className="relative overflow-hidden bg-gradient-to-l from-[#123F39] via-[#1B4B43] to-[#28665B] p-5 text-white sm:p-7">
        <div className="absolute -start-12 -top-14 h-40 w-40 rounded-full bg-white/[0.05]" />
        <div className="absolute -bottom-20 end-6 h-48 w-48 rounded-full bg-[#D8B98A]/10" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
              {copy.settings}
            </div>

            <h2 className="text-2xl font-bold">
              {courseType ===
              "private"
                ? copy.privateTitle
                : copy.groupTitle}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
              {courseType ===
              "private"
                ? copy.privateDescription
                : copy.groupDescription}
            </p>
          </div>

          <label className="flex min-w-[210px] cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <span>
              <span className="block text-xs text-white/60">
                {
                  copy.registrationStatus
                }
              </span>

              <span className="mt-1 block font-bold">
                {registrationOpen
                  ? copy.registrationOpen
                  : copy.registrationPaused}
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
              <input
                type="checkbox"
                name="registration_open"
                checked={
                  registrationOpen
                }
                onChange={(
                  event
                ) =>
                  setRegistrationOpen(
                    event
                      .target
                      .checked
                  )
                }
                className="peer sr-only"
              />

              <span className="absolute inset-0 rounded-full bg-white/25 transition peer-checked:bg-[#D7B579]" />

              <span className="absolute start-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[1.25rem] rtl:peer-checked:-translate-x-[1.25rem]" />
            </span>
          </label>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {courseType ===
        "group" ? (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[#25332F]">
                    {
                      copy.weeklyDay
                    }
                  </h3>

                  <p className="mt-1 text-sm text-[#7D8B86]">
                    {
                      copy.groupDayHint
                    }
                  </p>
                </div>

                <span className="rounded-full bg-[#F1F6F4] px-3 py-1 text-xs font-bold text-[#1B4B43]">
                  {
                    copy.oneSchedule
                  }
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {DAYS.map(
                  (day) => {
                    const active =
                      groupDay ===
                      day.value;

                    return (
                      <button
                        key={
                          day.value
                        }
                        type="button"
                        onClick={() =>
                          setGroupDay(
                            day.value
                          )
                        }
                        className={`rounded-2xl border px-3 py-4 text-center transition ${
                          active
                            ? "border-[#1B4B43] bg-[#1B4B43] text-white shadow-[0_10px_25px_rgba(27,75,67,0.18)]"
                            : "border-[#E3EAE6] bg-[#FAFCFB] text-[#596762] hover:border-[#AFC7BE] hover:bg-[#F5F9F7]"
                        }`}
                      >
                        <span className="block font-bold">
                          {
                            day.label
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <input
                type="hidden"
                name="group_day_of_week"
                value={
                  groupDay ??
                  ""
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px] lg:items-end">
              <div className="rounded-2xl border border-[#E3EAE6] bg-[#FAFCFB] p-4">
                <p className="text-sm font-bold text-[#25332F]">
                  {
                    copy.currentSchedule
                  }
                </p>

                <p className="mt-2 text-lg font-bold text-[#1B4B43]">
                  {groupDay ==
                  null
                    ? copy.chooseDay
                    : DAYS.find(
                        (
                          day
                        ) =>
                          day.value ===
                          groupDay
                      )?.label}

                  {groupTime &&
                  groupEndTime
                    ? ` • ${formatTime(
                        groupTime,
                        isArabic
                      )} → ${formatTime(
                        groupEndTime,
                        isArabic
                      )}`
                    : ""}
                </p>
              </div>

              <label>
                <span className="mb-2 block text-sm font-bold text-[#25332F]">
                  {
                    copy.fromHour
                  }
                </span>

                <input
                  type="time"
                  name="group_start_time"
                  value={
                    groupTime
                  }
                  onChange={(
                    event
                  ) =>
                    setGroupTime(
                      event
                        .target
                        .value
                    )
                  }
                  className="w-full rounded-2xl border border-[#DCE5E0] bg-white px-4 py-3 font-bold text-[#25332F] outline-none transition focus:border-[#1B4B43] focus:ring-4 focus:ring-[#1B4B43]/10"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-[#25332F]">
                  {
                    copy.toHour
                  }
                </span>

                <input
                  type="time"
                  name="group_end_time"
                  min={
                    groupTime ||
                    undefined
                  }
                  value={
                    groupEndTime
                  }
                  onChange={(
                    event
                  ) =>
                    setGroupEndTime(
                      event
                        .target
                        .value
                    )
                  }
                  className="w-full rounded-2xl border border-[#DCE5E0] bg-white px-4 py-3 font-bold text-[#25332F] outline-none transition focus:border-[#1B4B43] focus:ring-4 focus:ring-[#1B4B43]/10"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#25332F]">
                  {
                    copy.weeklyAvailability
                  }
                </h3>

                <p className="mt-1 text-sm leading-6 text-[#7D8B86]">
                  {
                    copy.privateAvailabilityHint
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-[#F7F3EC] px-4 py-2 text-sm font-bold text-[#8A633D]">
                {
                  privateSlots.length
                }{" "}
                {privateSlots.length ===
                1
                  ? copy.availablePeriod
                  : copy.availablePeriods}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {DAYS.map(
                (day) => {
                  const slots =
                    orderedSlots.filter(
                      (
                        slot
                      ) =>
                        slot.day_of_week ===
                        day.value
                    );

                  const draft =
                    getDraft(
                      day.value
                    );

                  const canAdd =
                    Boolean(
                      draft.start &&
                        draft.end &&
                        draft.end >
                          draft.start
                    );

                  return (
                    <div
                      key={
                        day.value
                      }
                      className="rounded-[22px] border border-[#E2E9E5] bg-[#FCFDFC] p-4 transition hover:border-[#C8D8D1]"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[#25332F]">
                            {
                              day.label
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-[#8A9792]">
                            {slots.length
                              ? `${slots.length} ${
                                  slots.length ===
                                  1
                                    ? copy.availablePeriod
                                    : copy.availablePeriods
                                }`
                              : copy.unavailable}
                          </p>
                        </div>

                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            slots.length
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          }`}
                        />
                      </div>

                      {slots.length >
                        0 && (
                        <div className="mb-4 space-y-2">
                          {slots.map(
                            (
                              slot
                            ) => (
                              <button
                                key={`${day.value}-${slot.start_time}-${slot.end_time}`}
                                type="button"
                                onClick={() =>
                                  removePrivateSlot(
                                    day.value,
                                    slot.start_time,
                                    slot.end_time
                                  )
                                }
                                className="group flex w-full items-center justify-between rounded-xl border border-[#D6E2DD] bg-white px-3 py-2.5 text-sm font-bold text-[#1B4B43] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              >
                                <span>
                                  {formatTime(
                                    slot.start_time,
                                    isArabic
                                  )}
                                  {"  →  "}
                                  {formatTime(
                                    slot.end_time,
                                    isArabic
                                  )}
                                </span>

                                <span className="text-lg leading-none opacity-40 group-hover:opacity-100">
                                  ×
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <label>
                          <span className="mb-1 block text-xs font-bold text-[#7D8B86]">
                            {
                              copy.from
                            }
                          </span>

                          <input
                            type="time"
                            value={
                              draft.start
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                day.value,
                                "start",
                                event
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-[#DFE7E3] bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#1B4B43]"
                          />
                        </label>

                        <label>
                          <span className="mb-1 block text-xs font-bold text-[#7D8B86]">
                            {
                              copy.to
                            }
                          </span>

                          <input
                            type="time"
                            min={
                              draft.start ||
                              undefined
                            }
                            value={
                              draft.end
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                day.value,
                                "end",
                                event
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-xl border border-[#DFE7E3] bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#1B4B43]"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          addPrivateSlot(
                            day.value
                          )
                        }
                        disabled={
                          !canAdd
                        }
                        className="mt-3 w-full rounded-xl bg-[#1B4B43] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#123F39] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        +{" "}
                        {
                          copy.addPeriod
                        }
                      </button>
                    </div>
                  );
                }
              )}
            </div>

            <input
              type="hidden"
              name="private_slots_json"
              value={JSON.stringify(
                orderedSlots.map(
                  (slot) => ({
                    day_of_week:
                      slot.day_of_week,
                    start_time:
                      normalizeTime(
                        slot.start_time
                      ),
                    end_time:
                      normalizeTime(
                        slot.end_time
                      ),
                  })
                )
              )}
            />
          </div>
        )}
      </div>
    </section>
  );
}
