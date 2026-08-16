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
          {
            foreignKeyName: "tickets_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      work_orders: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          unit_id: string;
          type: "corretiva" | "preventiva";
          origin_ticket_id: string | null;
          origin_preventive_plan_id: string | null;
          title: string;
          status: "aberta" | "em_andamento" | "concluida" | "cancelada";
          assigned_user_id: string | null;
          scheduled_date: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id: string;
          unit_id: string;
          type: "corretiva" | "preventiva";
          origin_ticket_id?: string | null;
          origin_preventive_plan_id?: string | null;
          title: string;
          status?: "aberta" | "em_andamento" | "concluida" | "cancelada";
          assigned_user_id?: string | null;
          scheduled_date?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["work_orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "work_orders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_origin_ticket_id_fkey";
            columns: ["origin_ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_origin_preventive_plan_id_fkey";
            columns: ["origin_preventive_plan_id"];
            isOneToOne: false;
            referencedRelation: "preventive_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      preventive_plans: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          unit_id: string;
          period_start: string;
          period_end: string;
          periodicity:
            | "semanal"
            | "quinzenal"
            | "mensal"
            | "bimestral"
            | "trimestral"
            | "semestral"
            | "anual"
            | "personalizada";
          assigned_user_id: string | null;
          status: "active" | "inactive";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id: string;
          unit_id: string;
          period_start: string;
          period_end: string;
          periodicity:
            | "semanal"
            | "quinzenal"
            | "mensal"
            | "bimestral"
            | "trimestral"
            | "semestral"
            | "anual"
            | "personalizada";
          assigned_user_id?: string | null;
          status?: "active" | "inactive";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["preventive_plans"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "preventive_plans_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "preventive_plans_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "preventive_plans_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "preventive_plans_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      preventive_plan_equipment: {
        Row: {
          id: string;
          company_id: string;
          preventive_plan_id: string;
          equipment_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          preventive_plan_id: string;
          equipment_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["preventive_plan_equipment"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "preventive_plan_equipment_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "preventive_plan_equipment_preventive_plan_id_fkey";
            columns: ["preventive_plan_id"];
            isOneToOne: false;
            referencedRelation: "preventive_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "preventive_plan_equipment_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_records: {
        Row: {
          id: string;
          company_id: string;
          work_order_id: string;
          equipment_id: string;
          technician_user_id: string | null;
          status: "draft" | "completed";
          cause_identified: string | null;
          service_performed: string | null;
          recommendation: string | null;
          diagnosis: string | null;
          notes: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          work_order_id: string;
          equipment_id: string;
          technician_user_id?: string | null;
          status?: "draft" | "completed";
          cause_identified?: string | null;
          service_performed?: string | null;
          recommendation?: string | null;
          diagnosis?: string | null;
          notes?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_records"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "maintenance_records_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_technician_user_id_fkey";
            columns: ["technician_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_templates: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          maintenance_type: "preventiva" | "corretiva" | "ambos";
          equipment_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          maintenance_type: "preventiva" | "corretiva" | "ambos";
          equipment_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checklist_templates"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checklist_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_template_items: {
        Row: {
          id: string;
          company_id: string;
          checklist_template_id: string;
          label: string;
          order_index: number;
          is_required: boolean;
          allows_other: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          checklist_template_id: string;
          label: string;
          order_index?: number;
          is_required?: boolean;
          allows_other?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checklist_template_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_template_items_checklist_template_id_fkey";
            columns: ["checklist_template_id"];
            isOneToOne: false;
            referencedRelation: "checklist_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_record_checklist_items: {
        Row: {
          id: string;
          company_id: string;
          maintenance_record_id: string;
          template_item_id: string | null;
          label_snapshot: string;
          status: "ok" | "nao_ok" | "nao_aplica";
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          maintenance_record_id: string;
          template_item_id?: string | null;
          label_snapshot: string;
          status?: "ok" | "nao_ok" | "nao_aplica";
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_record_checklist_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "maintenance_record_checklist_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_record_checklist_items_maintenance_record_id_fkey";
            columns: ["maintenance_record_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_record_checklist_items_template_item_id_fkey";
            columns: ["template_item_id"];
            isOneToOne: false;
            referencedRelation: "checklist_template_items";
            referencedColumns: ["id"];
          },
        ];
      };
      measurement_types: {
        Row: {
          id: string;
          company_id: string | null;
          key: string;
          label: string;
          unit_default: string | null;
          data_type: "numeric" | "text";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          key: string;
          label: string;
          unit_default?: string | null;
          data_type: "numeric" | "text";
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["measurement_types"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "measurement_types_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      measurements: {
        Row: {
          id: string;
          company_id: string;
          maintenance_record_id: string;
          measurement_type_id: string;
          value_numeric: number | null;
          value_text: string | null;
          unit: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          maintenance_record_id: string;
          measurement_type_id: string;
          value_numeric?: number | null;
          value_text?: string | null;
          unit?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["measurements"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "measurements_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "measurements_maintenance_record_id_fkey";
            columns: ["maintenance_record_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "measurements_measurement_type_id_fkey";
            columns: ["measurement_type_id"];
            isOneToOne: false;
            referencedRelation: "measurement_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "measurements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          company_id: string;
          work_order_id: string;
          maintenance_record_id: string | null;
          equipment_id: string;
          category: "equipamento" | "etiqueta" | "problema" | "antes" | "depois" | "outro";
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          work_order_id: string;
          maintenance_record_id?: string | null;
          equipment_id: string;
          category: "equipamento" | "etiqueta" | "problema" | "antes" | "depois" | "outro";
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attachments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "attachments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_maintenance_record_id_fkey";
            columns: ["maintenance_record_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
        ];
      };
      parts_requests: {
        Row: {
          id: string;
          company_id: string;
          work_order_id: string;
          maintenance_record_id: string | null;
          requested_by_user_id: string;
          part_name: string;
          quantity: number;
          note: string | null;
          status: "Solicitada" | "Em andamento" | "Aguardando" | "Resolvida" | "Cancelada";
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          work_order_id: string;
          maintenance_record_id?: string | null;
          requested_by_user_id: string;
          part_name: string;
          quantity?: number;
          note?: string | null;
          status?: "Solicitada" | "Em andamento" | "Aguardando" | "Resolvida" | "Cancelada";
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["parts_requests"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "parts_requests_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_requests_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_requests_maintenance_record_id_fkey";
            columns: ["maintenance_record_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_requests_requested_by_user_id_fkey";
            columns: ["requested_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_requests_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pmocs: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          period_start: string;
          period_end: string;
          title: string;
          status: "draft" | "generated";
          pdf_storage_path: string | null;
          generated_by: string | null;
          generated_at: string | null;
          responsible_technician_name: string | null;
          professional_registry: string | null;
          art_number: string | null;
          signature_storage_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id: string;
          period_start: string;
          period_end: string;
          title: string;
          status?: "draft" | "generated";
          pdf_storage_path?: string | null;
          generated_by?: string | null;
          generated_at?: string | null;
          responsible_technician_name?: string | null;
          professional_registry?: string | null;
          art_number?: string | null;
          signature_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pmocs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "pmocs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pmocs_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pmocs_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pmoc_work_orders: {
        Row: {
          id: string;
          company_id: string;
          pmoc_id: string;
          work_order_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          pmoc_id: string;
          work_order_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pmoc_work_orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "pmoc_work_orders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pmoc_work_orders_pmoc_id_fkey";
            columns: ["pmoc_id"];
            isOneToOne: false;
            referencedRelation: "pmocs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pmoc_work_orders_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_operations: {
        Row: {
          id: string;
          company_id: string;
          user_id: string | null;
          idempotency_key: string;
          entity_type: string;
          entity_id: string;
          status: "applied" | "duplicate" | "failed";
          applied_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id?: string | null;
          idempotency_key: string;
          entity_type: string;
          entity_id: string;
          status?: "applied" | "duplicate" | "failed";
          applied_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sync_operations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sync_operations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sync_operations_user_id_fkey";
            columns: ["user_id"];
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
