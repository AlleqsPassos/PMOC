// Escrito à mão para refletir as migrations 0001-0012 (supabase/migrations/)
// enquanto o projeto Supabase ainda não existe. Assim que ele for criado,
// substituir pelo output real e conferir que nada divergiu:
//
//   npx supabase gen types typescript --project-id <project-id> --schema public > src/types/database.types.ts
//
// Nota: a versão instalada de @supabase/postgrest-js faz parsing do
// `.select()` em nível de tipo e resolve joins embutidos (ex:
// `role:roles(key)`) através do array `Relationships` de cada tabela —
// por isso cada tabela abaixo declara suas FKs reais (nomes de constraint
// batem com a convenção padrão do Postgres `<tabela>_<coluna>_fkey`, exceto
// onde a migration nomeou explicitamente).

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          corporate_name: string;
          trade_name: string | null;
          cnpj: string | null;
          address: Record<string, unknown> | null;
          phone: string | null;
          email: string | null;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          corporate_name: string;
          trade_name?: string | null;
          cnpj?: string | null;
          address?: Record<string, unknown> | null;
          phone?: string | null;
          email?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          company_id: string;
          role_id: string;
          full_name: string;
          email: string;
          phone: string | null;
          status: "active" | "inactive";
          invited_by: string | null;
          activated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          role_id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          status?: "active" | "inactive";
          invited_by?: string | null;
          activated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          id: string;
          key: string;
          label: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          key: string;
          label: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          category: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Insert"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_permissions: {
        Row: {
          user_id: string;
          permission_id: string;
          granted: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          permission_id: string;
          granted: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_permissions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_permissions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invites: {
        Row: {
          id: string;
          company_id: string;
          role_id: string;
          code: string;
          full_name: string | null;
          email: string | null;
          status: "pending" | "used" | "expired" | "revoked";
          created_by: string;
          expires_at: string;
          used_at: string | null;
          used_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          role_id: string;
          code: string;
          full_name?: string | null;
          email?: string | null;
          status?: "pending" | "used" | "expired" | "revoked";
          created_by: string;
          expires_at?: string;
          used_at?: string | null;
          used_by_user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invites_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invites_used_by_user_id_fkey";
            columns: ["used_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          company_id: string;
          corporate_name: string;
          trade_name: string | null;
          cnpj: string | null;
          address: Record<string, unknown> | null;
          phone: string | null;
          email: string | null;
          responsible_name: string | null;
          notes: string | null;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          corporate_name: string;
          trade_name?: string | null;
          cnpj?: string | null;
          address?: Record<string, unknown> | null;
          phone?: string | null;
          email?: string | null;
          responsible_name?: string | null;
          notes?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          name: string;
          address: Record<string, unknown> | null;
          responsible_name: string | null;
          phone: string | null;
          notes: string | null;
          status: "active" | "inactive";
          deleted_at: string | null;
          deleted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id: string;
          name: string;
          address?: Record<string, unknown> | null;
          responsible_name?: string | null;
          phone?: string | null;
          notes?: string | null;
          status?: "active" | "inactive";
          deleted_at?: string | null;
          deleted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["units"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "units_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "units_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "units_deleted_by_fkey";
            columns: ["deleted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      sectors: {
        Row: {
          id: string;
          company_id: string;
          unit_id: string;
          name: string;
          notes: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          unit_id: string;
          name: string;
          notes?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sectors"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sectors_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sectors_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sectors_deleted_by_fkey";
            columns: ["deleted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      environments: {
        Row: {
          id: string;
          company_id: string;
          unit_id: string;
          sector_id: string | null;
          name: string;
          notes: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          unit_id: string;
          sector_id?: string | null;
          name: string;
          notes?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["environments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "environments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "environments_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "environments_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "environments_deleted_by_fkey";
            columns: ["deleted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment: {
        Row: {
          id: string;
          company_id: string;
          unit_id: string;
          sector_id: string | null;
          environment_id: string;
          tag: string;
          type: string | null;
          brand: string | null;
          model: string | null;
          serial_number: string | null;
          capacity_btu: number | null;
          refrigerant: string | null;
          voltage: string | null;
          status: "operacional" | "atencao" | "em_manutencao" | "inativo";
          notes: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          unit_id: string;
          sector_id?: string | null;
          environment_id: string;
          tag: string;
          type?: string | null;
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          capacity_btu?: number | null;
          refrigerant?: string | null;
          voltage?: string | null;
          status?: "operacional" | "atencao" | "em_manutencao" | "inativo";
          notes?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["equipment"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_environment_id_fkey";
            columns: ["environment_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_deleted_by_fkey";
            columns: ["deleted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          previous_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          source: "web" | "system";
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          previous_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          source?: "web" | "system";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        // Sem FK real em company_id (nem em entity_id) — ver comentário na
        // migration 0012: log é propositalmente polimórfico/desacoplado.
        Relationships: [];
      };
      tickets: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          unit_id: string;
          sector_id: string | null;
          environment_id: string | null;
          equipment_id: string | null;
          title: string;
          description: string | null;
          priority: "urgente" | "alta" | "media" | "baixa";
          status:
            | "aberto"
            | "designado"
            | "em_atendimento"
            | "aguardando_peca"
            | "aguardando_cliente"
            | "concluido"
            | "cancelado";
          assigned_user_id: string | null;
          opened_by_user_id: string;
          opened_at: string;
          work_order_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id: string;
          unit_id: string;
          sector_id?: string | null;
          environment_id?: string | null;
          equipment_id?: string | null;
          title: string;
          description?: string | null;
          priority?: "urgente" | "alta" | "media" | "baixa";
          status?:
            | "aberto"
            | "designado"
            | "em_atendimento"
            | "aguardando_peca"
            | "aguardando_cliente"
            | "concluido"
            | "cancelado";
          assigned_user_id?: string | null;
          opened_by_user_id: string;
          opened_at?: string;
          work_order_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_environment_id_fkey";
            columns: ["environment_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_opened_by_user_id_fkey";
            columns: ["opened_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_company_and_admin: {
        Args: {
          p_user_id: string;
          p_corporate_name: string;
          p_trade_name: string | null;
          p_cnpj: string | null;
          p_email: string | null;
          p_full_name: string;
        };
        Returns: string;
      };
      activate_invite: {
        Args: {
          p_code: string;
          p_user_id: string;
          p_full_name: string;
        };
        Returns: string;
      };
      has_permission: {
        Args: { p_user_id: string; p_permission_key: string };
        Returns: boolean;
      };
      get_ticket_timeline: {
        Args: { p_ticket_id: string };
        Returns: {
          id: string;
          action: string;
          previous_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          user_id: string | null;
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
