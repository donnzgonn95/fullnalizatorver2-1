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
      agent_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          linked_decision_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          linked_decision_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          linked_decision_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_notes_linked_decision_id_fkey"
            columns: ["linked_decision_id"]
            isOneToOne: false
            referencedRelation: "decision_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      bajtlik_capital: {
        Row: {
          available_cash: number
          currency: string
          id: string
          total_capital: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_cash?: number
          currency?: string
          id?: string
          total_capital?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_cash?: number
          currency?: string
          id?: string
          total_capital?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bajtlik_goals: {
        Row: {
          created_at: string
          currency: string
          current_amount: number
          deadline: string | null
          id: string
          is_active: boolean
          target_amount: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          is_active?: boolean
          target_amount?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          is_active?: boolean
          target_amount?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decision_logs: {
        Row: {
          approved: boolean | null
          created_at: string
          id: string
          note: string | null
          payload: Json | null
          source: string
          symbol: string | null
          user_id: string
          verdict: string
        }
        Insert: {
          approved?: boolean | null
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json | null
          source?: string
          symbol?: string | null
          user_id: string
          verdict: string
        }
        Update: {
          approved?: boolean | null
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json | null
          source?: string
          symbol?: string | null
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      detected_setups: {
        Row: {
          details: Json
          detected_at: string
          direction: string
          entry_price: number
          entry_time: string
          id: string
          interval: string
          result: string | null
          result_checked_at: string | null
          setup_type: string
          signal_strength: number
          status: string
          stop_loss: number
          symbol: string
          take_profit: number
          user_id: string | null
          wave_label: string | null
        }
        Insert: {
          details?: Json
          detected_at?: string
          direction: string
          entry_price: number
          entry_time?: string
          id?: string
          interval: string
          result?: string | null
          result_checked_at?: string | null
          setup_type: string
          signal_strength?: number
          status?: string
          stop_loss: number
          symbol: string
          take_profit: number
          user_id?: string | null
          wave_label?: string | null
        }
        Update: {
          details?: Json
          detected_at?: string
          direction?: string
          entry_price?: number
          entry_time?: string
          id?: string
          interval?: string
          result?: string | null
          result_checked_at?: string | null
          setup_type?: string
          signal_strength?: number
          status?: string
          stop_loss?: number
          symbol?: string
          take_profit?: number
          user_id?: string | null
          wave_label?: string | null
        }
        Relationships: []
      }
      investment_tactics: {
        Row: {
          created_at: string
          description: string | null
          entry_rules: Json | null
          exit_rules: Json | null
          id: string
          is_active: boolean
          name: string
          risk_profile: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entry_rules?: Json | null
          exit_rules?: Json | null
          id?: string
          is_active?: boolean
          name: string
          risk_profile?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entry_rules?: Json | null
          exit_rules?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          risk_profile?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_backtest_runs: {
        Row: {
          finished_at: string | null
          id: string
          params: Json | null
          started_at: string
          strategy_name: string
          summary: Json | null
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          params?: Json | null
          started_at?: string
          strategy_name: string
          summary?: Json | null
          user_id: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          params?: Json | null
          started_at?: string
          strategy_name?: string
          summary?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      lab_backtest_trades: {
        Row: {
          conviction_score: number | null
          created_at: string
          entry_price: number
          exit_price: number | null
          id: string
          instrument: string
          rationale: string | null
          result_pnl: number | null
          risk_reward: number | null
          risk_score: number | null
          run_id: string
          side: string
          stop_loss: number | null
          take_profit: number | null
          trade_date: string
          user_id: string
        }
        Insert: {
          conviction_score?: number | null
          created_at?: string
          entry_price: number
          exit_price?: number | null
          id?: string
          instrument: string
          rationale?: string | null
          result_pnl?: number | null
          risk_reward?: number | null
          risk_score?: number | null
          run_id: string
          side: string
          stop_loss?: number | null
          take_profit?: number | null
          trade_date: string
          user_id: string
        }
        Update: {
          conviction_score?: number | null
          created_at?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          instrument?: string
          rationale?: string | null
          result_pnl?: number | null
          risk_reward?: number | null
          risk_score?: number | null
          run_id?: string
          side?: string
          stop_loss?: number | null
          take_profit?: number | null
          trade_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_backtest_trades_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lab_backtest_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_paper_trades: {
        Row: {
          closed_at: string | null
          conviction_score: number | null
          created_at: string
          entry_price: number
          id: string
          instrument: string
          opened_at: string | null
          quantity: number
          rationale: string | null
          result_pnl: number | null
          risk_reward: number | null
          risk_score: number | null
          side: string
          status: string
          stop_loss: number | null
          tags: string[] | null
          take_profit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          conviction_score?: number | null
          created_at?: string
          entry_price?: number
          id?: string
          instrument: string
          opened_at?: string | null
          quantity?: number
          rationale?: string | null
          result_pnl?: number | null
          risk_reward?: number | null
          risk_score?: number | null
          side?: string
          status?: string
          stop_loss?: number | null
          tags?: string[] | null
          take_profit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          conviction_score?: number | null
          created_at?: string
          entry_price?: number
          id?: string
          instrument?: string
          opened_at?: string | null
          quantity?: number
          rationale?: string | null
          result_pnl?: number | null
          risk_reward?: number | null
          risk_score?: number | null
          side?: string
          status?: string
          stop_loss?: number | null
          tags?: string[] | null
          take_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_reports: {
        Row: {
          content: Json
          created_at: string
          id: string
          report_date: string
          report_type: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          report_date: string
          report_type: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          report_date?: string
          report_type?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_risk_settings: {
        Row: {
          block_correlated: boolean
          block_high_macro_risk: boolean
          cooldown_minutes: number
          id: string
          kill_switch: boolean
          max_daily_loss: number
          max_risk_per_trade: number
          max_trades_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          block_correlated?: boolean
          block_high_macro_risk?: boolean
          cooldown_minutes?: number
          id?: string
          kill_switch?: boolean
          max_daily_loss?: number
          max_risk_per_trade?: number
          max_trades_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          block_correlated?: boolean
          block_high_macro_risk?: boolean
          cooldown_minutes?: number
          id?: string
          kill_switch?: boolean
          max_daily_loss?: number
          max_risk_per_trade?: number
          max_trades_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_telegram_config: {
        Row: {
          bot_token: string | null
          chat_id: string | null
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_token?: string | null
          chat_id?: string | null
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_token?: string | null
          chat_id?: string | null
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_journal: {
        Row: {
          closed_at: string | null
          created_at: string
          entry_price: number
          exit_price: number | null
          id: string
          note: string | null
          opened_at: string
          pnl: number | null
          quantity: number
          side: string
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          pnl?: number | null
          quantity?: number
          side?: string
          status?: string
          symbol: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          pnl?: number | null
          quantity?: number
          side?: string
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_terms_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_terms_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_watchlist: {
        Row: {
          created_at: string
          id: string
          market: string | null
          note: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          market?: string | null
          note?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          market?: string | null
          note?: string | null
          symbol?: string
          user_id?: string
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
      watchlist: {
        Row: {
          created_at: string
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
