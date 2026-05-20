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
      agent_decisions: {
        Row: {
          agent_id: string
          confidence: number
          created_at: string
          guideline_id: string | null
          id: string
          payload: Json
          rationale: string
          report_id: string | null
          report_kind: string | null
          symbol: string | null
          verdict: string
        }
        Insert: {
          agent_id: string
          confidence?: number
          created_at?: string
          guideline_id?: string | null
          id?: string
          payload?: Json
          rationale: string
          report_id?: string | null
          report_kind?: string | null
          symbol?: string | null
          verdict: string
        }
        Update: {
          agent_id?: string
          confidence?: number
          created_at?: string
          guideline_id?: string | null
          id?: string
          payload?: Json
          rationale?: string
          report_id?: string | null
          report_kind?: string | null
          symbol?: string | null
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_decisions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_guideline_id_fkey"
            columns: ["guideline_id"]
            isOneToOne: false
            referencedRelation: "agent_guidelines"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_guidelines: {
        Row: {
          agent_id: string | null
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          priority: number
          rules: Json
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          rules?: Json
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          rules?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_guidelines_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_journal: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          decision_id: string | null
          id: string
          tags: string[]
          topic: string
          trade_id: string | null
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string
          decision_id?: string | null
          id?: string
          tags?: string[]
          topic: string
          trade_id?: string | null
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          decision_id?: string | null
          id?: string
          tags?: string[]
          topic?: string
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_journal_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_journal_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "agent_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_journal_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "agent_paper_trades"
            referencedColumns: ["id"]
          },
        ]
      }
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
      agent_paper_trades: {
        Row: {
          agent_id: string
          closed_at: string | null
          decision_id: string
          entry_price: number
          exit_price: number | null
          id: string
          opened_at: string
          pnl: number | null
          quantity: number
          report_id: string
          side: string
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
        }
        Insert: {
          agent_id: string
          closed_at?: string | null
          decision_id: string
          entry_price: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          pnl?: number | null
          quantity: number
          report_id: string
          side: string
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
        }
        Update: {
          agent_id?: string
          closed_at?: string | null
          decision_id?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          opened_at?: string
          pnl?: number | null
          quantity?: number
          report_id?: string
          side?: string
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_paper_trades_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_paper_trades_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "agent_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_report_reads: {
        Row: {
          agent_id: string
          id: string
          notes: string | null
          read_at: string
          report_id: string
          report_kind: string
        }
        Insert: {
          agent_id: string
          id?: string
          notes?: string | null
          read_at?: string
          report_id: string
          report_kind: string
        }
        Update: {
          agent_id?: string
          id?: string
          notes?: string | null
          read_at?: string
          report_id?: string
          report_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_report_reads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_reputation: {
        Row: {
          agent_id: string
          events_count: number
          hits: number
          last_active_at: string | null
          misses: number
          score: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          events_count?: number
          hits?: number
          last_active_at?: string | null
          misses?: number
          score?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          events_count?: number
          hits?: number
          last_active_at?: string | null
          misses?: number
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_reputation_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          kind: string
          mentor_id: string | null
          name: string
          slug: string
          status: string
          updated_at: string
          version: string
          wallet_address: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          mentor_id?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string
          version?: string
          wallet_address?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          mentor_id?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          version?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "agents"
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
      cron_run_logs: {
        Row: {
          details: Json
          duration_ms: number | null
          finished_at: string | null
          id: string
          job_name: string
          started_at: string
          status: string
        }
        Insert: {
          details?: Json
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          job_name: string
          started_at?: string
          status?: string
        }
        Update: {
          details?: Json
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          job_name?: string
          started_at?: string
          status?: string
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
      eljot_ledger: {
        Row: {
          agent_id: string | null
          amount: number
          created_at: string
          id: string
          ledger_entry_id: string | null
          reason: string
          wallet_address: string | null
        }
        Insert: {
          agent_id?: string | null
          amount: number
          created_at?: string
          id?: string
          ledger_entry_id?: string | null
          reason: string
          wallet_address?: string | null
        }
        Update: {
          agent_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          ledger_entry_id?: string | null
          reason?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eljot_ledger_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eljot_ledger_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "golden_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      golden_ledger: {
        Row: {
          agent_id: string | null
          category: string
          created_at: string
          entry_hash: string
          id: string
          payload: Json
          prev_hash: string | null
          seq: number
          source: string
          summary: string
          symbol: string | null
        }
        Insert: {
          agent_id?: string | null
          category: string
          created_at?: string
          entry_hash: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          seq?: number
          source: string
          summary: string
          symbol?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string
          created_at?: string
          entry_hash?: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          seq?: number
          source?: string
          summary?: string
          symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "golden_ledger_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
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
      notification_log: {
        Row: {
          channel: string
          error: string | null
          id: string
          sent_at: string
          setup_id: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          error?: string | null
          id?: string
          sent_at?: string
          setup_id: string
          status: string
          user_id: string
        }
        Update: {
          channel?: string
          error?: string | null
          id?: string
          sent_at?: string
          setup_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          email_address: string | null
          email_enabled: boolean
          id: string
          intervals_filter: string[]
          min_signal_strength: number
          setup_types_filter: string[]
          symbols_filter: string[]
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          intervals_filter?: string[]
          min_signal_strength?: number
          setup_types_filter?: string[]
          symbols_filter?: string[]
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          intervals_filter?: string[]
          min_signal_strength?: number
          setup_types_filter?: string[]
          symbols_filter?: string[]
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
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
      private_reports: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          shared_with_agents: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          shared_with_agents?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          shared_with_agents?: boolean
          title?: string
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
      reports: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          report_date: string
          source: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          report_date?: string
          source?: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          report_date?: string
          source?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      scanner_config: {
        Row: {
          enabled: boolean
          id: string
          intervals: string[]
          symbols: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          intervals?: string[]
          symbols?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          intervals?: string[]
          symbols?: string[]
          updated_at?: string
          updated_by?: string | null
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
      treasury_balance: {
        Row: {
          amount: number
          currency: string
          updated_at: string
        }
        Insert: {
          amount?: number
          currency: string
          updated_at?: string
        }
        Update: {
          amount?: number
          currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      treasury_events: {
        Row: {
          agent_id: string | null
          created_at: string
          currency: string
          decision_id: string | null
          delta: number
          eljot_entry_id: string | null
          id: string
          payload: Json
          reason: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          currency?: string
          decision_id?: string | null
          delta: number
          eljot_entry_id?: string | null
          id?: string
          payload?: Json
          reason: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          currency?: string
          decision_id?: string | null
          delta?: number
          eljot_entry_id?: string | null
          id?: string
          payload?: Json
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_events_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "agent_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_events_eljot_entry_id_fkey"
            columns: ["eljot_entry_id"]
            isOneToOne: false
            referencedRelation: "eljot_ledger"
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
