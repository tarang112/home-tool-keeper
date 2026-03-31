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
          expiration_date: string | null
          house_id: string | null
          id: string
          item_image_url: string | null
          location: string
          location_detail: string | null
          location_image_url: string | null
          name: string
          notes: string | null
          product_image_url: string | null
          quantity: number
          quantity_unit: string
          subcategory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category?: string
          created_at?: string
          expiration_date?: string | null
          house_id?: string | null
          id?: string
          item_image_url?: string | null
          location?: string
          location_detail?: string | null
          location_image_url?: string | null
          name: string
          notes?: string | null
          product_image_url?: string | null
          quantity?: number
          quantity_unit?: string
          subcategory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          category?: string
          created_at?: string
          expiration_date?: string | null
          house_id?: string | null
          id?: string
          item_image_url?: string | null
          location?: string
          location_detail?: string | null
          location_image_url?: string | null
          name?: string
          notes?: string | null
          product_image_url?: string | null
          quantity?: number
          quantity_unit?: string
          subcategory?: string | null
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
      notifications: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          message?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_house_id?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_house_id?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
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
      has_full_house_access: {
        Args: { _house_id: string; _user_id: string }
        Returns: boolean
      }
      is_house_member: {
        Args: { _house_id: string; _user_id: string }
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
    }
    Enums: {
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
      house_role: ["owner", "editor", "viewer"],
    },
  },
} as const
