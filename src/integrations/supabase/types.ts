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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      billing_preferences: {
        Row: {
          billing_cycle: string
          created_at: string
          id: string
          location_count: number
          order_confirmation_email: string | null
          order_confirmation_from_name: string | null
          plan: string
          receipt_email: string | null
          receipt_from_name: string | null
          status: string
          total_amount_cents: number
          unit_amount_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          id?: string
          location_count?: number
          order_confirmation_email?: string | null
          order_confirmation_from_name?: string | null
          plan?: string
          receipt_email?: string | null
          receipt_from_name?: string | null
          status?: string
          total_amount_cents?: number
          unit_amount_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          id?: string
          location_count?: number
          order_confirmation_email?: string | null
          order_confirmation_from_name?: string | null
          plan?: string
          receipt_email?: string | null
          receipt_from_name?: string | null
          status?: string
          total_amount_cents?: number
          unit_amount_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          property_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          property_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          property_type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      house_invites: {
        Row: {
          created_at: string
          email: string
          house_id: string
          id: string
          invite_token: string
          invited_by: string
          relationship: string | null
          role: string
          share_mode: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          house_id: string
          id?: string
          invite_token?: string
          invited_by: string
          relationship?: string | null
          role?: string
          share_mode?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          house_id?: string
          id?: string
          invite_token?: string
          invited_by?: string
          relationship?: string | null
          role?: string
          share_mode?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_invites_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      house_members: {
        Row: {
          created_at: string
          house_id: string
          id: string
          relationship: string | null
          role: Database["public"]["Enums"]["house_role"]
          share_mode: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          house_id: string
          id?: string
          relationship?: string | null
          role?: Database["public"]["Enums"]["house_role"]
          share_mode?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          house_id?: string
          id?: string
          relationship?: string | null
          role?: Database["public"]["Enums"]["house_role"]
          share_mode?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_members_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          business_type: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          owner_id: string
          property_type: string
          updated_at: string
        }
        Insert: {
          business_type?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          owner_id: string
          property_type?: string
          updated_at?: string
        }
        Update: {
          business_type?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          owner_id?: string
          property_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category: string
          created_at: string
          deleted_at: string | null
          expiration_date: string | null
          house_id: string | null
          id: string
          item_image_url: string | null
          lent_at: string | null
          lent_notes: string | null
          lent_to: string | null
          location: string
          location_detail: string | null
          location_image_url: string | null
          name: string
          notes: string | null
          product_image_url: string | null
          quantity: number
          quantity_unit: string
          subcategory: string | null
          total_price: number | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          expiration_date?: string | null
          house_id?: string | null
          id?: string
          item_image_url?: string | null
          lent_at?: string | null
          lent_notes?: string | null
          lent_to?: string | null
          location?: string
          location_detail?: string | null
          location_image_url?: string | null
          name: string
          notes?: string | null
          product_image_url?: string | null
          quantity?: number
          quantity_unit?: string
          subcategory?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          expiration_date?: string | null
          house_id?: string | null
          id?: string
          item_image_url?: string | null
          lent_at?: string | null
          lent_notes?: string | null
          lent_to?: string | null
          location?: string
          location_detail?: string | null
          location_image_url?: string | null
          name?: string
          notes?: string | null
          product_image_url?: string | null
          quantity?: number
          quantity_unit?: string
          subcategory?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      item_defaults: {
        Row: {
          category: string | null
          house_id: string | null
          id: string
          item_name: string
          location: string | null
          quantity_unit: string | null
          subcategory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          house_id?: string | null
          id?: string
          item_name: string
          location?: string | null
          quantity_unit?: string | null
          subcategory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          house_id?: string | null
          id?: string
          item_name?: string
          location?: string | null
          quantity_unit?: string | null
          subcategory?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      item_shares: {
        Row: {
          created_at: string
          house_id: string
          id: string
          item_id: string
          shared_by: string
        }
        Insert: {
          created_at?: string
          house_id: string
          id?: string
          item_id: string
          shared_by: string
        }
        Update: {
          created_at?: string
          house_id?: string
          id?: string
          item_id?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_shares_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_shares_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_leads: {
        Row: {
          campaign: string | null
          created_at: string
          email: string
          household_type: string | null
          id: string
          landing_page: string | null
          medium: string | null
          message: string | null
          name: string | null
          referrer: string | null
          session_id: string | null
          source: string | null
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          email: string
          household_type?: string | null
          id?: string
          landing_page?: string | null
          medium?: string | null
          message?: string | null
          name?: string | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
        }
        Update: {
          campaign?: string | null
          created_at?: string
          email?: string
          household_type?: string | null
          id?: string
          landing_page?: string | null
          medium?: string | null
          message?: string | null
          name?: string | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
        }
        Relationships: []
      }
      landing_page_events: {
        Row: {
          campaign: string | null
          created_at: string
          device: string
          event_name: string
          id: string
          lead_id: string | null
          medium: string
          metadata: Json
          page: string
          referrer: string | null
          session_id: string | null
          source: string
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          device?: string
          event_name: string
          id?: string
          lead_id?: string | null
          medium?: string
          metadata?: Json
          page?: string
          referrer?: string | null
          session_id?: string | null
          source?: string
        }
        Update: {
          campaign?: string | null
          created_at?: string
          device?: string
          event_name?: string
          id?: string
          lead_id?: string | null
          medium?: string
          metadata?: Json
          page?: string
          referrer?: string | null
          session_id?: string | null
          source?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          expiration_email: boolean
          expiration_in_app: boolean
          expiration_push: boolean
          expiration_reminder_days: number[]
          id: string
          restock_email: boolean
          restock_in_app: boolean
          restock_push: boolean
          timezone: string
          updated_at: string
          user_id: string
          warranty_email: boolean
          warranty_in_app: boolean
          warranty_push: boolean
          warranty_reminder_days: number[]
        }
        Insert: {
          created_at?: string
          expiration_email?: boolean
          expiration_in_app?: boolean
          expiration_push?: boolean
          expiration_reminder_days?: number[]
          id?: string
          restock_email?: boolean
          restock_in_app?: boolean
          restock_push?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
          warranty_email?: boolean
          warranty_in_app?: boolean
          warranty_push?: boolean
          warranty_reminder_days?: number[]
        }
        Update: {
          created_at?: string
          expiration_email?: boolean
          expiration_in_app?: boolean
          expiration_push?: boolean
          expiration_reminder_days?: number[]
          id?: string
          restock_email?: boolean
          restock_in_app?: boolean
          restock_push?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
          warranty_email?: boolean
          warranty_in_app?: boolean
          warranty_push?: boolean
          warranty_reminder_days?: number[]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          item_id: string | null
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          item_id?: string | null
          message?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          item_id?: string | null
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_house_id: string | null
          display_name: string | null
          id: string
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_house_id?: string | null
          display_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_house_id?: string | null
          display_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
        Relationships: []
      }
      visitor_logs: {
        Row: {
          created_at: string
          device: string
          id: string
          ip_hash: string | null
          page: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device: string
          id?: string
          ip_hash?: string | null
          page: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string
          id?: string
          ip_hash?: string | null
          page?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite_by_token: {
        Args: { _token: string; _user_id: string }
        Returns: string
      }
      accept_pending_invites: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      create_house_invite_link: {
        Args: {
          _house_id: string
          _relationship?: string
          _role?: string
          _share_mode?: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_house_invitable_user: {
        Args: { _email: string; _house_id: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      get_house_member_profiles: {
        Args: { _house_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          email: string
          house_id: string
          id: string
          invite_token: string
          invited_by: string
          relationship: string | null
          role: string
          share_mode: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "house_invites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_invite_role: {
        Args: { _email: string; _house_id: string }
        Returns: string
      }
      get_pending_house_invites: {
        Args: { _house_id: string }
        Returns: {
          created_at: string
          email: string
          house_id: string
          id: string
          relationship: string
          role: string
          share_mode: string
          status: string
        }[]
      }
      has_full_house_access: {
        Args: { _house_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_house_member: {
        Args: { _house_id: string; _user_id: string }
        Returns: boolean
      }
      is_invite_for_user: {
        Args: { _invite_email: string; _user_id: string }
        Returns: boolean
      }
      is_item_owner: {
        Args: { _item_id: string; _user_id: string }
        Returns: boolean
      }
      is_item_shared_to_user: {
        Args: { _item_id: string; _user_id: string }
        Returns: boolean
      }
      is_link_invite_email: { Args: { _email: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      house_role: "owner" | "editor" | "viewer"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      house_role: ["owner", "editor", "viewer"],
    },
  },
} as const
