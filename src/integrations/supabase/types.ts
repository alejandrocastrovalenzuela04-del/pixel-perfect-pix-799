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
  public: {
    Tables: {
      actividades: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["actividad_estado"]
          fecha_actualizacion: string | null
          id: string
          registro_mensual_id: string
          responsable_id: string | null
          tipo: Database["public"]["Enums"]["actividad_tipo"]
          ultima_actualizacion_por: string | null
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["actividad_estado"]
          fecha_actualizacion?: string | null
          id?: string
          registro_mensual_id: string
          responsable_id?: string | null
          tipo: Database["public"]["Enums"]["actividad_tipo"]
          ultima_actualizacion_por?: string | null
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["actividad_estado"]
          fecha_actualizacion?: string | null
          id?: string
          registro_mensual_id?: string
          responsable_id?: string | null
          tipo?: Database["public"]["Enums"]["actividad_tipo"]
          ultima_actualizacion_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividades_registro_mensual_id_fkey"
            columns: ["registro_mensual_id"]
            isOneToOne: false
            referencedRelation: "registros_mensuales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_ultima_actualizacion_por_fkey"
            columns: ["ultima_actualizacion_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
          regimen_fiscal: string
          rfc: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
          regimen_fiscal: string
          rfc: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
          regimen_fiscal?: string
          rfc?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id: string
          nombre: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      registros_mensuales: {
        Row: {
          anio: number
          created_at: string
          empresa_id: string
          id: string
          isr_pagado: number | null
          iva_monto: number | null
          iva_tipo: Database["public"]["Enums"]["iva_tipo"]
          mes: number
          opinion_cumplimiento:
            | Database["public"]["Enums"]["opinion_cumplimiento"]
            | null
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          empresa_id: string
          id?: string
          isr_pagado?: number | null
          iva_monto?: number | null
          iva_tipo?: Database["public"]["Enums"]["iva_tipo"]
          mes: number
          opinion_cumplimiento?:
            | Database["public"]["Enums"]["opinion_cumplimiento"]
            | null
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          empresa_id?: string
          id?: string
          isr_pagado?: number | null
          iva_monto?: number | null
          iva_tipo?: Database["public"]["Enums"]["iva_tipo"]
          mes?: number
          opinion_cumplimiento?:
            | Database["public"]["Enums"]["opinion_cumplimiento"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_mensuales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      actividad_estado: "PENDIENTE" | "EN_PROCESO" | "REALIZADO"
      actividad_tipo:
        | "CONTABILIDAD_MENSUAL"
        | "CONCILIACION_BANCARIA"
        | "PAGOS_PROVISIONALES"
        | "DIOT"
      app_role: "CEO" | "SUPERVISOR" | "EMPLEADO"
      iva_tipo: "NO_DETERMINADO" | "PAGADO" | "A_FAVOR"
      opinion_cumplimiento: "POSITIVA" | "NEGATIVA"
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
  public: {
    Enums: {
      actividad_estado: ["PENDIENTE", "EN_PROCESO", "REALIZADO"],
      actividad_tipo: [
        "CONTABILIDAD_MENSUAL",
        "CONCILIACION_BANCARIA",
        "PAGOS_PROVISIONALES",
        "DIOT",
      ],
      app_role: ["CEO", "SUPERVISOR", "EMPLEADO"],
      iva_tipo: ["NO_DETERMINADO", "PAGADO", "A_FAVOR"],
      opinion_cumplimiento: ["POSITIVA", "NEGATIVA"],
    },
  },
} as const
