// Hand-written to match the output shape of `supabase gen types typescript`.
// Source of truth: supabase/migrations/ (20261005000000_init.sql, 20261008000000_form_modes_history.sql)
// Regenerate (optional): supabase gen types typescript --linked > src/types/database.ts
// (then re-add the convenience exports at the bottom).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      classes: {
        Row: {
          created_at: string;
          grade: string | null;
          id: string;
          name: string;
          section: string | null;
          teacher_id: string;
        };
        Insert: {
          created_at?: string;
          grade?: string | null;
          id?: string;
          name: string;
          section?: string | null;
          teacher_id?: string;
        };
        Update: {
          created_at?: string;
          grade?: string | null;
          id?: string;
          name?: string;
          section?: string | null;
          teacher_id?: string;
        };
        Relationships: [];
      };
      form_events: {
        Row: {
          event_date: string;
          form_id: string;
          id: number;
          kind: string;
          mark_id: string | null;
          new_note: string | null;
          new_option_key: string | null;
          occurred_at: string;
          old_note: string | null;
          old_option_key: string | null;
          student_id: string;
          teacher_id: string;
        };
        Insert: {
          event_date: string;
          form_id: string;
          id?: never;
          kind: string;
          mark_id?: string | null;
          new_note?: string | null;
          new_option_key?: string | null;
          occurred_at?: string;
          old_note?: string | null;
          old_option_key?: string | null;
          student_id: string;
          teacher_id: string;
        };
        Update: {
          event_date?: string;
          form_id?: string;
          id?: never;
          kind?: string;
          mark_id?: string | null;
          new_note?: string | null;
          new_option_key?: string | null;
          occurred_at?: string;
          old_note?: string | null;
          old_option_key?: string | null;
          student_id?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_events_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      form_marks: {
        Row: {
          created_at: string;
          form_id: string;
          id: string;
          mark_date: string;
          marked_at: string;
          note: string | null;
          option_key: string;
          student_id: string;
          teacher_id: string;
        };
        Insert: {
          created_at?: string;
          form_id: string;
          id?: string;
          mark_date?: string;
          marked_at?: string;
          note?: string | null;
          option_key: string;
          student_id: string;
          teacher_id?: string;
        };
        Update: {
          created_at?: string;
          form_id?: string;
          id?: string;
          mark_date?: string;
          marked_at?: string;
          note?: string | null;
          option_key?: string;
          student_id?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_marks_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_marks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      form_entries: {
        Row: {
          id: string;
          note: string | null;
          option_key: string | null;
          session_id: string;
          student_id: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          note?: string | null;
          option_key?: string | null;
          session_id: string;
          student_id: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          note?: string | null;
          option_key?: string | null;
          session_id?: string;
          student_id?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_entries_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "form_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_entries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      form_sessions: {
        Row: {
          created_at: string;
          form_id: string;
          id: string;
          session_date: string;
          status: string;
          teacher_id: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          form_id: string;
          id?: string;
          session_date?: string;
          status?: string;
          teacher_id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          form_id?: string;
          id?: string;
          session_date?: string;
          status?: string;
          teacher_id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_sessions_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
        ];
      };
      forms: {
        Row: {
          archived: boolean;
          class_id: string;
          created_at: string;
          description: string | null;
          id: string;
          mode: string;
          options: Json;
          sort_order: number;
          subject: string | null;
          teacher_id: string;
          title: string;
        };
        Insert: {
          archived?: boolean;
          class_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          mode?: string;
          options?: Json;
          sort_order?: number;
          subject?: string | null;
          teacher_id?: string;
          title: string;
        };
        Update: {
          archived?: boolean;
          class_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          mode?: string;
          options?: Json;
          sort_order?: number;
          subject?: string | null;
          teacher_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forms_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          class_id: string;
          created_at: string;
          full_name: string;
          id: string;
          number: string | null;
          photo_url: string | null;
          teacher_id: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          full_name: string;
          id?: string;
          number?: string | null;
          photo_url?: string | null;
          teacher_id?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          full_name?: string;
          id?: string;
          number?: string | null;
          photo_url?: string | null;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      copy_form_to_classes: {
        Args: { p_class_ids: string[]; p_form_id: string };
        Returns: {
          archived: boolean;
          class_id: string;
          created_at: string;
          description: string | null;
          id: string;
          mode: string;
          options: Json;
          sort_order: number;
          subject: string | null;
          teacher_id: string;
          title: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "forms";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      form_history: {
        Args: {
          p_before_id?: number;
          p_before_occurred_at?: string;
          p_form_id: string;
          p_from?: string;
          p_limit?: number;
          p_student_id?: string;
          p_to?: string;
        };
        Returns: {
          event_date: string;
          id: number;
          kind: string;
          mark_id: string | null;
          new_note: string | null;
          new_option_key: string | null;
          occurred_at: string;
          old_note: string | null;
          old_option_key: string | null;
          student_id: string;
          student_name: string;
          student_number: string | null;
          undone: boolean;
        }[];
      };
      form_tally: {
        Args: { p_day?: string; p_form_id: string; p_from?: string; p_to?: string };
        Returns: {
          counts: Json;
          day_counts: Json;
          full_name: string;
          number: string | null;
          student_id: string;
        }[];
      };
      is_valid_form_options: {
        Args: { p_options: Json };
        Returns: boolean;
      };
      undo_last_mark: {
        Args: { p_form_id: string; p_mark_date?: string; p_option_key?: string; p_student_id: string };
        Returns: {
          created_at: string;
          form_id: string;
          id: string;
          mark_date: string;
          marked_at: string;
          note: string | null;
          option_key: string;
          student_id: string;
          teacher_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "form_marks";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ---------------------------------------------------------------------------
// Generic helpers (same as the generated file)
// ---------------------------------------------------------------------------

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

// ---------------------------------------------------------------------------
// Convenience exports
// ---------------------------------------------------------------------------

export type FormOptionTone = "positive" | "neutral" | "warning" | "negative";

export type FormOption = {
  key: string;
  label: string;
  tone: FormOptionTone;
  /** İsteğe bağlı puan (artı +1, eksi −1). Formda en az bir puanlı seçenek varsa net hesaplanır. */
  score?: number;
};

/**
 * `daily`: günde bir kez — her gün her öğrenciye tek değer (form_sessions + form_entries).
 * `repeatable`: birikimli — aynı gün birden çok işaret (form_marks).
 * Formda kayıt ya da işaret varken veritabanı türün değişmesine izin vermez.
 */
export type FormMode = "daily" | "repeatable";

export type FormSessionStatus = "draft" | "published";

/** Geçmiş olayının türü (form_events.kind). */
export type FormEventKind =
  | "entry_created"
  | "entry_updated"
  | "entry_deleted"
  /** Geçmiş tutulmaya başlamadan önceki kayıtlı değer (migration'da bir kez üretildi). */
  | "entry_baseline"
  | "mark_added"
  | "mark_removed";

export type ClassRow = Tables<"classes">;
export type StudentRow = Tables<"students">;
/** `options` is stored as jsonb; DB check constraint guarantees FormOption[]. */
export type FormRow = Omit<Tables<"forms">, "options" | "mode"> & {
  options: FormOption[];
  mode: FormMode;
};
export type FormSessionRow = Omit<Tables<"form_sessions">, "status"> & {
  status: FormSessionStatus;
};
export type FormEntryRow = Tables<"form_entries">;
export type FormMarkRow = Tables<"form_marks">;
export type FormEventRow = Omit<Tables<"form_events">, "kind"> & { kind: FormEventKind };

export type ClassInsert = TablesInsert<"classes">;
export type StudentInsert = TablesInsert<"students">;
export type FormInsert = TablesInsert<"forms">;
export type FormSessionInsert = TablesInsert<"form_sessions">;
export type FormEntryInsert = TablesInsert<"form_entries">;
export type FormMarkInsert = TablesInsert<"form_marks">;
