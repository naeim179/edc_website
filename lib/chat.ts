import type {
  SupabaseClient,
} from "@supabase/supabase-js";


type Relation<T> =
  | T
  | T[]
  | null
  | undefined;


function one<T>(
  value: Relation<T>
): T | null {
  if (
    Array.isArray(value)
  ) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}


type TeacherProfileRow = {
  image_url:
    | string
    | null;
};


type ProfileRow = {
  full_name:
    | string
    | null;

  avatar_url:
    | string
    | null;

  teacher_profiles?:
    Relation<TeacherProfileRow>;
};


type CourseRow = {
  title:
    | string
    | null;
};


type ConversationRow = {
  id: string;

  student_id: string;

  teacher_id: string;

  course_id: string;

  last_message_at:
    | string
    | null;

  last_message_preview:
    | string
    | null;

  student_unread_count?:
    | number
    | null;

  teacher_unread_count?:
    | number
    | null;

  course?:
    Relation<CourseRow>;

  student?:
    Relation<ProfileRow>;

  teacher?:
    Relation<ProfileRow>;
};


export interface ConversationListItem {
  id: string;

  student_id: string;

  teacher_id: string;

  course_id: string;

  last_message_at:
    | string
    | null;

  last_message_preview:
    | string
    | null;

  unread_count: number;

  course_title: string;

  other_party_name: string;

  other_party_avatar:
    | string
    | null;
}


export interface ChatMessage {
  id: string;

  conversation_id: string;

  sender_id: string;

  content: string;

  created_at: string;

  read_at:
    | string
    | null;

  message_type:
    | "text"
    | "image"
    | "file";

  attachment_url:
    | string
    | null;

  attachment_name:
    | string
    | null;

  attachment_size:
    | number
    | null;

  edited_at:
    | string
    | null;

  deleted_at:
    | string
    | null;
}


function mapConversation(
  row: ConversationRow,
  role:
    | "student"
    | "teacher"
): ConversationListItem {
  const course =
    one(row.course);

  const student =
    one(row.student);

  const teacher =
    one(row.teacher);

  const teacherProfile =
    one(
      teacher
        ?.teacher_profiles
    );

  return {
    id:
      row.id,

    student_id:
      row.student_id,

    teacher_id:
      row.teacher_id,

    course_id:
      row.course_id,

    last_message_at:
      row.last_message_at,

    last_message_preview:
      row.last_message_preview,

    unread_count:
      role === "student"
        ? row.student_unread_count ??
          0
        : row.teacher_unread_count ??
          0,

    course_title:
      course?.title ??
      "الدورة",

    other_party_name:
      role === "student"
        ? teacher?.full_name ??
          "المدرس"
        : student?.full_name ??
          "الطالب",

    other_party_avatar:
      role === "student"
        ? teacherProfile
            ?.image_url ??
          teacher?.avatar_url ??
          null
        : student?.avatar_url ??
          null,
  };
}


export async function getConversationsForUser(
  supabase: SupabaseClient,
  userId: string,
  role:
    | "student"
    | "teacher"
): Promise<
  ConversationListItem[]
> {
  const matchColumn =
    role === "student"
      ? "student_id"
      : "teacher_id";

  const {
    data,
    error,
  } = await supabase
    .from(
      "conversations"
    )
    .select(`
      id,
      student_id,
      teacher_id,
      course_id,
      last_message_at,
      last_message_preview,
      student_unread_count,
      teacher_unread_count,

      course:courses (
        title
      ),

      student:profiles!conversations_student_id_fkey (
        full_name,
        avatar_url
      ),

      teacher:profiles!conversations_teacher_id_fkey (
        full_name,
        avatar_url,

        teacher_profiles (
          image_url
        )
      )
    `)
    .eq(
      matchColumn,
      userId
    )
    .order(
      "last_message_at",
      {
        ascending:
          false,

        nullsFirst:
          false,
      }
    );

  if (error) {
    console.error(
      "getConversationsForUser error:",
      error.message
    );

    throw new Error(
      "تعذر تحميل المحادثات"
    );
  }

  return (
    (
      data ??
      []
    ) as unknown as ConversationRow[]
  ).map(
    (
      row
    ) =>
      mapConversation(
        row,
        role
      )
  );
}


export async function getAllConversationsForAdmin(
  supabase: SupabaseClient
): Promise<
  ConversationListItem[]
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "conversations"
    )
    .select(`
      id,
      student_id,
      teacher_id,
      course_id,
      last_message_at,
      last_message_preview,
      student_unread_count,
      teacher_unread_count,

      course:courses (
        title
      ),

      student:profiles!conversations_student_id_fkey (
        full_name,
        avatar_url
      ),

      teacher:profiles!conversations_teacher_id_fkey (
        full_name,
        avatar_url,

        teacher_profiles (
          image_url
        )
      )
    `)
    .order(
      "last_message_at",
      {
        ascending:
          false,

        nullsFirst:
          false,
      }
    );

  if (error) {
    console.error(
      "getAllConversationsForAdmin error:",
      error.message
    );

    throw new Error(
      "تعذر تحميل المحادثات"
    );
  }

  return (
    (
      data ??
      []
    ) as unknown as ConversationRow[]
  ).map(
    (
      row
    ) => {
      const course =
        one(row.course);

      const student =
        one(row.student);

      const teacher =
        one(row.teacher);

      return {
        id:
          row.id,

        student_id:
          row.student_id,

        teacher_id:
          row.teacher_id,

        course_id:
          row.course_id,

        last_message_at:
          row.last_message_at,

        last_message_preview:
          row.last_message_preview,

        unread_count:
          0,

        course_title:
          course?.title ??
          "الدورة",

        other_party_name:
          `${student?.full_name ?? "طالب"} ↔ ${teacher?.full_name ?? "مدرس"}`,

        other_party_avatar:
          student?.avatar_url ??
          null,
      };
    }
  );
}


export async function getConversationById(
  supabase: SupabaseClient,
  conversationId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "conversations"
    )
    .select(`
      id,
      student_id,
      teacher_id,
      course_id,

      course:courses (
        title
      ),

      student:profiles!conversations_student_id_fkey (
        full_name,
        avatar_url
      ),

      teacher:profiles!conversations_teacher_id_fkey (
        full_name,
        avatar_url,

        teacher_profiles (
          image_url
        )
      )
    `)
    .eq(
      "id",
      conversationId
    )
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    return null;
  }

  const row =
    data as unknown as ConversationRow;

  const course =
    one(row.course);

  const student =
    one(row.student);

  const teacher =
    one(row.teacher);

  const teacherProfile =
    one(
      teacher
        ?.teacher_profiles
    );

  /*
   * Normalize relations to arrays for compatibility
   * with MessageThread.
   */
  return {
    id:
      row.id,

    student_id:
      row.student_id,

    teacher_id:
      row.teacher_id,

    course_id:
      row.course_id,

    course:
      course
        ? [
            course,
          ]
        : [],

    student:
      student
        ? [
            {
              full_name:
                student.full_name,

              avatar_url:
                student.avatar_url,
            },
          ]
        : [],

    teacher:
      teacher
        ? [
            {
              ...teacher,

              avatar_url:
                teacherProfile
                  ?.image_url ??
                teacher
                  .avatar_url ??
                null,

              teacher_profiles:
                teacherProfile
                  ? [
                      teacherProfile,
                    ]
                  : [],
            },
          ]
        : [],
  };
}


export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string
): Promise<
  ChatMessage[]
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "messages"
    )
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      created_at,
      read_at,
      message_type,
      attachment_url,
      attachment_name,
      attachment_size,
      edited_at,
      deleted_at
    `)
    .eq(
      "conversation_id",
      conversationId
    )
    .order(
      "created_at",
      {
        ascending:
          true,
      }
    );

  if (error) {
    console.error(
      "getMessages error:",
      error.message
    );

    throw new Error(
      "تعذر تحميل الرسائل"
    );
  }

  return (
    data ??
    []
  ) as ChatMessage[];
}
