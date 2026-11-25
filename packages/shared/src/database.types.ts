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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          apartment: string | null
          comment: string | null
          created_at: string
          entrance: string | null
          floor: string | null
          id: string
          intercom: string | null
          is_default: boolean
          label: string | null
          lat: number
          lng: number
          user_id: string
        }
        Insert: {
          address_line: string
          apartment?: string | null
          comment?: string | null
          created_at?: string
          entrance?: string | null
          floor?: string | null
          id?: string
          intercom?: string | null
          is_default?: boolean
          label?: string | null
          lat: number
          lng: number
          user_id: string
        }
        Update: {
          address_line?: string
          apartment?: string | null
          comment?: string | null
          created_at?: string
          entrance?: string | null
          floor?: string | null
          id?: string
          intercom?: string | null
          is_default?: boolean
          label?: string | null
          lat?: number
          lng?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bonus_transactions: {
        Row: {
          amount: number
          created_at: string
          id: number
          order_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: never
          order_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: never
          order_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          product_id: string
          quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          image_url: string | null
          is_active: boolean
          name_kk: string
          name_ru: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_kk: string
          name_ru: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_kk?: string
          name_ru?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string | null
          chat_id: string
          created_at: string
          id: string
          image_url: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          chat_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          chat_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_closed: boolean
          order_id: string | null
          type: Database["public"]["Enums"]["chat_type"]
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_closed?: boolean
          order_id?: string | null
          type: Database["public"]["Enums"]["chat_type"]
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_closed?: boolean
          order_id?: string | null
          type?: Database["public"]["Enums"]["chat_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chats_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_locations: {
        Row: {
          courier_id: string
          heading: number | null
          lat: number
          lng: number
          speed: number | null
          updated_at: string
        }
        Insert: {
          courier_id: string
          heading?: number | null
          lat: number
          lng: number
          speed?: number | null
          updated_at?: string
        }
        Update: {
          courier_id?: string
          heading?: number | null
          lat?: number
          lng?: number
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_locations_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: true
            referencedRelation: "couriers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      couriers: {
        Row: {
          created_at: string
          deliveries_count: number
          document_photo_url: string | null
          iin: string | null
          is_online: boolean
          rating: number | null
          rejection_reason: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["courier_application_status"]
          updated_at: string
          user_id: string
          vehicle: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          created_at?: string
          deliveries_count?: number
          document_photo_url?: string | null
          iin?: string | null
          is_online?: boolean
          rating?: number | null
          rejection_reason?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["courier_application_status"]
          updated_at?: string
          user_id: string
          vehicle?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          created_at?: string
          deliveries_count?: number
          document_photo_url?: string | null
          iin?: string | null
          is_online?: boolean
          rating?: number | null
          rejection_reason?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["courier_application_status"]
          updated_at?: string
          user_id?: string
          vehicle?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "couriers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_slots: {
        Row: {
          booked: number
          capacity: number
          ends_at: string
          id: string
          starts_at: string
          store_id: string
        }
        Insert: {
          booked?: number
          capacity?: number
          ends_at: string
          id?: string
          starts_at: string
          store_id: string
        }
        Update: {
          booked?: number
          capacity?: number
          ends_at?: string
          id?: string
          starts_at?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_slots_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          order_id: string
          picked_quantity: number | null
          price: number
          product_id: string | null
          quantity: number
          replacement_approved: boolean | null
          replacement_name: string | null
          replacement_price: number | null
          replacement_product_id: string | null
          replacement_quantity: number | null
          status: Database["public"]["Enums"]["order_item_status"]
          unit: Database["public"]["Enums"]["product_unit"]
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          order_id: string
          picked_quantity?: number | null
          price: number
          product_id?: string | null
          quantity: number
          replacement_approved?: boolean | null
          replacement_name?: string | null
          replacement_price?: number | null
          replacement_product_id?: string | null
          replacement_quantity?: number | null
          status?: Database["public"]["Enums"]["order_item_status"]
          unit: Database["public"]["Enums"]["product_unit"]
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          order_id?: string
          picked_quantity?: number | null
          price?: number
          product_id?: string | null
          quantity?: number
          replacement_approved?: boolean | null
          replacement_name?: string | null
          replacement_price?: number | null
          replacement_product_id?: string | null
          replacement_quantity?: number | null
          status?: Database["public"]["Enums"]["order_item_status"]
          unit?: Database["public"]["Enums"]["product_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_replacement_product_id_fkey"
            columns: ["replacement_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          address_comment: string | null
          address_line: string
          apartment: string | null
          bonus_earned: number
          bonus_spent: number
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          comment: string | null
          contact_phone: string
          courier_assigned_at: string | null
          courier_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          discount_amount: number
          entrance: string | null
          floor: string | null
          id: string
          intercom: string | null
          items_total: number
          lat: number
          lng: number
          number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          picked_up_at: string | null
          picker_id: string | null
          placed_at: string
          promo_code_id: string | null
          ready_at: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          substitution_policy: Database["public"]["Enums"]["substitution_policy"]
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address_comment?: string | null
          address_line: string
          apartment?: string | null
          bonus_earned?: number
          bonus_spent?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id: string
          comment?: string | null
          contact_phone: string
          courier_assigned_at?: string | null
          courier_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          discount_amount?: number
          entrance?: string | null
          floor?: string | null
          id?: string
          intercom?: string | null
          items_total?: number
          lat: number
          lng: number
          number?: never
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_up_at?: string | null
          picker_id?: string | null
          placed_at?: string
          promo_code_id?: string | null
          ready_at?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          substitution_policy?: Database["public"]["Enums"]["substitution_policy"]
          total?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address_comment?: string | null
          address_line?: string
          apartment?: string | null
          bonus_earned?: number
          bonus_spent?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string
          comment?: string | null
          contact_phone?: string
          courier_assigned_at?: string | null
          courier_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          discount_amount?: number
          entrance?: string | null
          floor?: string | null
          id?: string
          intercom?: string | null
          items_total?: number
          lat?: number
          lng?: number
          number?: never
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_up_at?: string | null
          picker_id?: string | null
          placed_at?: string
          promo_code_id?: string | null
          ready_at?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          substitution_policy?: Database["public"]["Enums"]["substitution_policy"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_picker_id_fkey"
            columns: ["picker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "delivery_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          payload: Json | null
          provider: string
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          payload?: Json | null
          provider: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payload?: Json | null
          provider?: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category_id: string | null
          created_at: string
          description_kk: string | null
          description_ru: string | null
          id: string
          image_urls: string[]
          is_available: boolean
          is_weighted: boolean
          name_kk: string | null
          name_ru: string
          old_price: number | null
          price: number
          qty_step: number
          sku: string | null
          sort_order: number
          stock_qty: number | null
          store_id: string
          unit: Database["public"]["Enums"]["product_unit"]
          unit_size: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description_kk?: string | null
          description_ru?: string | null
          id?: string
          image_urls?: string[]
          is_available?: boolean
          is_weighted?: boolean
          name_kk?: string | null
          name_ru: string
          old_price?: number | null
          price: number
          qty_step?: number
          sku?: string | null
          sort_order?: number
          stock_qty?: number | null
          store_id: string
          unit?: Database["public"]["Enums"]["product_unit"]
          unit_size?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description_kk?: string | null
          description_ru?: string | null
          id?: string
          image_urls?: string[]
          is_available?: boolean
          is_weighted?: boolean
          name_kk?: string | null
          name_ru?: string
          old_price?: number | null
          price?: number
          qty_step?: number
          sku?: string | null
          sort_order?: number
          stock_qty?: number | null
          store_id?: string
          unit?: Database["public"]["Enums"]["product_unit"]
          unit_size?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bonus_balance: number
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean
          locale: Database["public"]["Enums"]["app_locale"]
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bonus_balance?: number
          created_at?: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          locale?: Database["public"]["Enums"]["app_locale"]
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bonus_balance?: number
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          locale?: Database["public"]["Enums"]["app_locale"]
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at: string | null
          first_order_only: boolean
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number
          per_user_limit: number
          starts_at: string | null
          store_id: string | null
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at?: string | null
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_user_limit?: number
          starts_at?: string | null
          store_id?: string | null
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_user_limit?: number
          starts_at?: string | null
          store_id?: string | null
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          app: string
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          app: string
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          app?: string
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          courier_rating: number | null
          created_at: string
          order_id: string
          store_rating: number | null
        }
        Insert: {
          client_id: string
          comment?: string | null
          courier_rating?: number | null
          created_at?: string
          order_id: string
          store_rating?: number | null
        }
        Update: {
          client_id?: string
          comment?: string | null
          courier_rating?: number | null
          created_at?: string
          order_id?: string
          store_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_staff: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["store_staff_role"]
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["store_staff_role"]
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["store_staff_role"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address_line: string
          commission_percent: number
          cover_url: string | null
          created_at: string
          delivery_fee: number
          delivery_radius_m: number
          description_kk: string | null
          description_ru: string | null
          free_delivery_from: number | null
          id: string
          is_active: boolean
          lat: number
          lng: number
          logo_url: string | null
          min_order_amount: number
          name: string
          opening_hours: Json
          phone: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          address_line: string
          commission_percent?: number
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_radius_m?: number
          description_kk?: string | null
          description_ru?: string | null
          free_delivery_from?: number | null
          id?: string
          is_active?: boolean
          lat: number
          lng: number
          logo_url?: string | null
          min_order_amount?: number
          name: string
          opening_hours?: Json
          phone?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address_line?: string
          commission_percent?: number
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_radius_m?: number
          description_kk?: string | null
          description_ru?: string | null
          free_delivery_from?: number | null
          id?: string
          is_active?: boolean
          lat?: number
          lng?: number
          logo_url?: string | null
          min_order_amount?: number
          name?: string
          opening_hours?: Json
          phone?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_order: { Args: { p_order_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_approved_courier: { Args: never; Returns: boolean }
      is_store_manager: { Args: { p_store_id: string }; Returns: boolean }
      is_store_staff: { Args: { p_store_id: string }; Returns: boolean }
      // ---- order logic (migration 20261125100200) ----
      check_promo: {
        Args: { p_code: string; p_store_id: string; p_items_total: number }
        Returns: number
      }
      place_order: {
        Args: {
          p_store_id: string
          p_address_id: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_substitution_policy?: Database["public"]["Enums"]["substitution_policy"]
          p_slot_id?: string | null
          p_promo_code?: string | null
          p_use_bonus?: boolean
          p_comment?: string | null
        }
        Returns: Database["public"]["Tables"]["orders"]["Row"]
      }
      update_order_status: {
        Args: {
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
          p_note?: string | null
        }
        Returns: Database["public"]["Tables"]["orders"]["Row"]
      }
      picker_update_item: {
        Args: {
          p_item_id: string
          p_status: Database["public"]["Enums"]["order_item_status"]
          p_picked_quantity?: number | null
          p_replacement_product_id?: string | null
          p_replacement_quantity?: number | null
        }
        Returns: Database["public"]["Tables"]["order_items"]["Row"]
      }
      client_respond_replacement: {
        Args: { p_item_id: string; p_approve: boolean }
        Returns: Database["public"]["Tables"]["order_items"]["Row"]
      }
      courier_available_orders: {
        Args: never
        Returns: {
          order_id: string
          number: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          store_name: string
          store_address: string
          store_lat: number
          store_lng: number
          delivery_address: string
          delivery_lat: number
          delivery_lng: number
          distance_to_store_m: number | null
          delivery_distance_m: number
          total: number
          delivery_fee: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          placed_at: string
        }[]
      }
      courier_accept_order: {
        Args: { p_order_id: string }
        Returns: Database["public"]["Tables"]["orders"]["Row"]
      }
      courier_release_order: {
        Args: { p_order_id: string; p_reason?: string | null }
        Returns: Database["public"]["Tables"]["orders"]["Row"]
      }
      admin_review_courier: {
        Args: {
          p_user_id: string
          p_status: Database["public"]["Enums"]["courier_application_status"]
          p_reason?: string | null
        }
        Returns: Database["public"]["Tables"]["couriers"]["Row"]
      }
      admin_set_user_role: {
        Args: { p_user_id: string; p_role: Database["public"]["Enums"]["user_role"] }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
      // ---- admin helpers (migration 20261125100400) ----
      find_profile_by_phone: {
        Args: { p_phone: string }
        Returns: { id: string; full_name: string | null; phone: string | null }[]
      }
      staff_profiles: {
        Args: { p_store_id: string }
        Returns: { id: string; full_name: string | null; phone: string | null }[]
      }
      admin_set_user_blocked: {
        Args: { p_user_id: string; p_blocked: boolean }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
    }
    Enums: {
      app_locale: "ru" | "kk"
      chat_type: "order" | "support"
      courier_application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "blocked"
      discount_type: "percent" | "fixed"
      order_item_status: "pending" | "picked" | "replaced" | "missing"
      order_status:
        | "awaiting_payment"
        | "placed"
        | "accepted"
        | "picking"
        | "ready"
        | "delivering"
        | "delivered"
        | "cancelled"
      payment_method: "card" | "cash"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      product_unit: "pcs" | "kg" | "g" | "l" | "ml" | "pack"
      store_staff_role: "manager" | "picker"
      substitution_policy: "replace_similar" | "contact_me" | "remove"
      user_role: "client" | "courier" | "picker" | "store_manager" | "admin"
      vehicle_type: "foot" | "bicycle" | "scooter" | "car"
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
      app_locale: ["ru", "kk"],
      chat_type: ["order", "support"],
      courier_application_status: [
        "pending",
        "approved",
        "rejected",
        "blocked",
      ],
      discount_type: ["percent", "fixed"],
      order_item_status: ["pending", "picked", "replaced", "missing"],
      order_status: [
        "awaiting_payment",
        "placed",
        "accepted",
        "picking",
        "ready",
        "delivering",
        "delivered",
        "cancelled",
      ],
      payment_method: ["card", "cash"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      product_unit: ["pcs", "kg", "g", "l", "ml", "pack"],
      store_staff_role: ["manager", "picker"],
      substitution_policy: ["replace_similar", "contact_me", "remove"],
      user_role: ["client", "courier", "picker", "store_manager", "admin"],
      vehicle_type: ["foot", "bicycle", "scooter", "car"],
    },
  },
} as const
