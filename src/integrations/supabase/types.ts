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
      actividad_historial: {
        Row: {
          accion: string
          actividad_id: string
          detalle: Json | null
          empresa_id: string
          estado_anterior:
            | Database["public"]["Enums"]["actividad_estado"]
            | null
          estado_nuevo: Database["public"]["Enums"]["actividad_estado"] | null
          fecha: string
          id: string
          revierte_id: string | null
          snapshot_anterior: Json | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          actividad_id: string
          detalle?: Json | null
          empresa_id: string
          estado_anterior?:
            | Database["public"]["Enums"]["actividad_estado"]
            | null
          estado_nuevo?: Database["public"]["Enums"]["actividad_estado"] | null
          fecha?: string
          id?: string
          revierte_id?: string | null
          snapshot_anterior?: Json | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          actividad_id?: string
          detalle?: Json | null
          empresa_id?: string
          estado_anterior?:
            | Database["public"]["Enums"]["actividad_estado"]
            | null
          estado_nuevo?: Database["public"]["Enums"]["actividad_estado"] | null
          fecha?: string
          id?: string
          revierte_id?: string | null
          snapshot_anterior?: Json | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividad_historial_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_historial_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_historial_revierte_id_fkey"
            columns: ["revierte_id"]
            isOneToOne: false
            referencedRelation: "actividad_historial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_historial_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      actividad_tipos: {
        Row: {
          activo: boolean
          clave: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          clave: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          clave?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      actividades: {
        Row: {
          comentarios: string | null
          creado_por: string | null
          created_at: string
          datos: Json
          empresa_id: string
          estado: Database["public"]["Enums"]["actividad_estado"]
          fecha_actualizacion: string | null
          fecha_inicio: string | null
          fecha_realizacion: string | null
          id: string
          isr_pagado: number | null
          iva_a_favor: number | null
          iva_pagado: number | null
          opinion_fecha: string | null
          opinion_resultado:
            | Database["public"]["Enums"]["opinion_cumplimiento"]
            | null
          periodo_anio: number
          periodo_mes: number
          registro_mensual_id: string | null
          responsable_id: string | null
          tipo: Database["public"]["Enums"]["actividad_tipo"] | null
          tipo_clave: string
          ultima_actualizacion_por: string | null
          updated_at: string
        }
        Insert: {
          comentarios?: string | null
          creado_por?: string | null
          created_at?: string
          datos?: Json
          empresa_id: string
          estado?: Database["public"]["Enums"]["actividad_estado"]
          fecha_actualizacion?: string | null
          fecha_inicio?: string | null
          fecha_realizacion?: string | null
          id?: string
          isr_pagado?: number | null
          iva_a_favor?: number | null
          iva_pagado?: number | null
          opinion_fecha?: string | null
          opinion_resultado?:
            | Database["public"]["Enums"]["opinion_cumplimiento"]
            | null
          periodo_anio: number
          periodo_mes: number
          registro_mensual_id?: string | null
          responsable_id?: string | null
          tipo?: Database["public"]["Enums"]["actividad_tipo"] | null
          tipo_clave: string
          ultima_actualizacion_por?: string | null
          updated_at?: string
        }
        Update: {
          comentarios?: string | null
          creado_por?: string | null
          created_at?: string
          datos?: Json
          empresa_id?: string
          estado?: Database["public"]["Enums"]["actividad_estado"]
          fecha_actualizacion?: string | null
          fecha_inicio?: string | null
          fecha_realizacion?: string | null
          id?: string
          isr_pagado?: number | null
          iva_a_favor?: number | null
          iva_pagado?: number | null
          opinion_fecha?: string | null
          opinion_resultado?:
            | Database["public"]["Enums"]["opinion_cumplimiento"]
            | null
          periodo_anio?: number
          periodo_mes?: number
          registro_mensual_id?: string | null
          responsable_id?: string | null
          tipo?: Database["public"]["Enums"]["actividad_tipo"] | null
          tipo_clave?: string
          ultima_actualizacion_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "actividades_tipo_clave_fkey"
            columns: ["tipo_clave"]
            isOneToOne: false
            referencedRelation: "actividad_tipos"
            referencedColumns: ["clave"]
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
      empresa_usuarios: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_usuarios_user_id_fkey"
            columns: ["user_id"]
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
      puede_ver_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      revertir_actividad: {
        Args: { _actividad_id: string }
        Returns: undefined
      }
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
