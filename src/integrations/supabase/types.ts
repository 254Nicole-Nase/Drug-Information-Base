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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      drug_labels: {
        Row: {
          brand_name: string | null
          created_at: string
          effective_time: string | null
          generic_name: string | null
          id: string
          label_json: Json
          manufacturer_name: string | null
          pharmacologic_class: string[] | null
          product_type: string | null
          route: string | null
          rxcui: string[] | null
          set_id: string | null
          substance_name: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          effective_time?: string | null
          generic_name?: string | null
          id: string
          label_json: Json
          manufacturer_name?: string | null
          pharmacologic_class?: string[] | null
          product_type?: string | null
          route?: string | null
          rxcui?: string[] | null
          set_id?: string | null
          substance_name?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          effective_time?: string | null
          generic_name?: string | null
          id?: string
          label_json?: Json
          manufacturer_name?: string | null
          pharmacologic_class?: string[] | null
          product_type?: string | null
          route?: string | null
          rxcui?: string[] | null
          set_id?: string | null
          substance_name?: string | null
        }
        Relationships: []
      }
      ke_products: {
        Row: {
          atc_class: string | null
          atc_code: string | null
          brand_name: string
          country_of_origin: string | null
          created_at: string
          data_source: string
          dosage_form: string | null
          generic_key: string
          generic_name: string
          id: string
          manufacturer: string | null
          ppb_registration_no: string | null
          registration_status: string
          source_url: string | null
          strength: string | null
          updated_at: string
          verification_note: string
        }
        Insert: {
          atc_class?: string | null
          atc_code?: string | null
          brand_name: string
          country_of_origin?: string | null
          created_at?: string
          data_source?: string
          dosage_form?: string | null
          generic_key: string
          generic_name: string
          id?: string
          manufacturer?: string | null
          ppb_registration_no?: string | null
          registration_status?: string
          source_url?: string | null
          strength?: string | null
          updated_at?: string
          verification_note?: string
        }
        Update: {
          atc_class?: string | null
          atc_code?: string | null
          brand_name?: string
          country_of_origin?: string | null
          created_at?: string
          data_source?: string
          dosage_form?: string | null
          generic_key?: string
          generic_name?: string
          id?: string
          manufacturer?: string | null
          ppb_registration_no?: string | null
          registration_status?: string
          source_url?: string | null
          strength?: string | null
          updated_at?: string
          verification_note?: string
        }
        Relationships: []
      }
      label_chunks: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          label_id: string
          search_tsv: unknown
          section_key: string
          section_title: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          label_id: string
          search_tsv?: unknown
          section_key: string
          section_title: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          label_id?: string
          search_tsv?: unknown
          section_key?: string
          section_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_chunks_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "drug_labels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_chunks_hybrid: {
        Args: {
          match_count: number
          query_embedding: string
          query_text: string
        }
        Returns: {
          chunk_id: string
          content: string
          keyword_rank: number
          label_id: string
          section_key: string
          section_title: string
          similarity: number
        }[]
      }
      match_chunks_vector: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          label_id: string
          section_key: string
          section_title: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
