export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          course_id: string
          created_at: string
          id: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          course_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offers: {
        Row: {
          course_id: string
          created_at: string
          discount_type: string | null
          discount_value: number | null
          final_price: number | null
          id: string
          max_students: number | null
          price: number
          type: Database["public"]["Enums"]["course_offer_type"]
        }
        Insert: {
          course_id: string
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          final_price?: number | null
          id?: string
          max_students?: number | null
          price?: number
          type: Database["public"]["Enums"]["course_offer_type"]
        }
        Update: {
          course_id?: string
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          final_price?: number | null
          id?: string
          max_students?: number | null
          price?: number
          type?: Database["public"]["Enums"]["course_offer_type"]
        }
        Relationships: [
          {
            foreignKeyName: "course_offers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          course_type: Database["public"]["Enums"]["course_type_enum"]
          created_at: string | null
          currency: string | null
          description: string | null
          discount_type: string | null
          discount_value: number
          id: string
          image_url: string | null
          instructor_id: string | null
          is_free: boolean | null
          is_published: boolean | null
          price: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          course_type: Database["public"]["Enums"]["course_type_enum"]
          created_at?: string | null
          currency?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          price?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          course_type?: Database["public"]["Enums"]["course_type_enum"]
          created_at?: string | null
          currency?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          price?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          offer_id: string | null
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          offer_id?: string | null
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          offer_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "course_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          is_completed: boolean
          lesson_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          is_completed?: boolean
          lesson_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          is_completed?: boolean
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          bunny_library_id: string | null
          bunny_video_id: string | null
          content_url: string | null
          created_at: string | null
          duration: string | null
          id: string
          is_free_preview: boolean | null
          mux_asset_id: string | null
          mux_playback_id: string | null
          order_index: number
          section_id: string
          title: string
          video_provider: string | null
          youtube_video_id: string | null
        }
        Insert: {
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          content_url?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          is_free_preview?: boolean | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          order_index?: number
          section_id: string
          title: string
          video_provider?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          content_url?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          is_free_preview?: boolean | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          order_index?: number
          section_id?: string
          title?: string
          video_provider?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          auto_renew_requested: boolean
          course_id: string
          created_at: string | null
          currency: string | null
          fulfilled_at: string | null
          id: string
          offer_id: string | null
          paytabs_tran_ref: string | null
          source: string
          status: string
          subscription_months: number
          user_id: string
        }
        Insert: {
          amount: number
          auto_renew_requested?: boolean
          course_id: string
          created_at?: string | null
          currency?: string | null
          fulfilled_at?: string | null
          id?: string
          offer_id?: string | null
          paytabs_tran_ref?: string | null
          source?: string
          status?: string
          subscription_months?: number
          user_id: string
        }
        Update: {
          amount?: number
          auto_renew_requested?: boolean
          course_id?: string
          created_at?: string | null
          currency?: string | null
          fulfilled_at?: string | null
          id?: string
          offer_id?: string | null
          paytabs_tran_ref?: string | null
          source?: string
          status?: string
          subscription_months?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "course_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          offer_id: string | null
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          offer_id?: string | null
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          offer_id?: string | null
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "course_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payment_tokens: {
        Row: {
          created_at: string
          subscription_id: string
          token: string
          token_tran_ref: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          subscription_id: string
          token: string
          token_tran_ref: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          subscription_id?: string
          token?: string
          token_tran_ref?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payment_tokens_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          course_id: string
          created_at: string
          currency: string
          duration_months: number
          expires_at: string | null
          id: string
          last_payment_at: string | null
          last_payment_tran_ref: string | null
          renewal_attempted_at: string | null
          renewal_failures: number
          starts_at: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          auto_renew?: boolean
          course_id: string
          created_at?: string
          currency?: string
          duration_months: number
          expires_at?: string | null
          id?: string
          last_payment_at?: string | null
          last_payment_tran_ref?: string | null
          renewal_attempted_at?: string | null
          renewal_failures?: number
          starts_at?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          course_id?: string
          created_at?: string
          currency?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          last_payment_at?: string | null
          last_payment_tran_ref?: string | null
          renewal_attempted_at?: string | null
          renewal_failures?: number
          starts_at?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          bio: string | null
          created_at: string
          experience_years: number | null
          id: string
          image_url: string | null
          specialization: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          image_url?: string | null
          specialization?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          image_url?: string | null
          specialization?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      lessons_public: {
        Row: {
          course_id: string | null
          created_at: string | null
          duration: string | null
          id: string | null
          is_free_preview: boolean | null
          order_index: number | null
          section_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_create_section: {
        Args: { p_course_id: string; p_title: string }
        Returns: Json
      }
      admin_delete_section: {
        Args: { p_course_id: string; p_section_id: string }
        Returns: undefined
      }
      admin_update_section: {
        Args: {
          p_course_id: string
          p_order_index: number
          p_section_id: string
          p_title: string
        }
        Returns: undefined
      }
      can_read_lesson: {
        Args: { p_is_free_preview: boolean; p_section_id: string }
        Returns: boolean
      }
      claim_due_subscription_renewals: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          course_id: string
          currency: string
          duration_months: number
          expires_at: string
          student_id: string
          subscription_id: string
          token: string
          token_tran_ref: string
        }[]
      }
      fulfill_subscription_order: {
        Args: { p_order_id: string; p_token?: string; p_tran_ref: string }
        Returns: {
          fulfilled_course_id: string
          subscription_auto_renew: boolean
          subscription_expires_at: string
        }[]
      }
      get_course_lesson_catalog: {
        Args: { p_course_id: string }
        Returns: {
          bunny_library_id: string
          bunny_video_id: string
          course_id: string
          duration: string
          id: string
          is_free_preview: boolean
          mux_asset_id: string
          mux_playback_id: string
          order_index: number
          section_id: string
          section_order_index: number
          title: string
          video_provider: string
          youtube_video_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_course_instructor: {
        Args: { p_course_id: string; p_teacher_id: string }
        Returns: boolean
      }
      is_public_instructor: { Args: { pid: string }; Returns: boolean }
      is_published_course: { Args: { cid: string }; Returns: boolean }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] }
      record_subscription_renewal_failure: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "admin" | "teacher"
      course_offer_type: "group" | "private"
      course_type_enum: "group" | "private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["student", "admin", "teacher"],
      course_offer_type: ["group", "private"],
      course_type_enum: ["group", "private"],
    },
  },
} as const
