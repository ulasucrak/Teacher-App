// Hand-written to match the output shape of `supabase gen types typescript`.
// Source of truth: supabase/migrations/20261005000000_init.sql
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
      is_valid_form_options: {
        Args: { p_options: Json };
        Returns: boolean;
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
};

export type FormSessionStatus = "draft" | "published";

export type ClassRow = Tables<"classes">;
export type StudentRow = Tables<"students">;
/** `options` is stored as jsonb; DB check constraint guarantees FormOption[]. */
export type FormRow = Omit<Tables<"forms">, "options"> & { options: FormOption[] };
export type FormSessionRow = Omit<Tables<"form_sessions">, "status"> & {
  status: FormSessionStatus;
};
export type FormEntryRow = Tables<"form_entries">;

export type ClassInsert = TablesInsert<"classes">;
export type StudentInsert = TablesInsert<"students">;
export type FormInsert = TablesInsert<"forms">;
export type FormSessionInsert = TablesInsert<"form_sessions">;
export type FormEntryInsert = TablesInsert<"form_entries">;
