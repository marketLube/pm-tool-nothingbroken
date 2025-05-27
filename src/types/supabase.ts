export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: 'admin' | 'manager' | 'employee';
          team: 'creative' | 'web';
          join_date: string;
          avatar_url: string | null;
          is_active: boolean;
          allowed_statuses: string[] | null;
          password: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          role: 'admin' | 'manager' | 'employee';
          team: 'creative' | 'web';
          join_date: string;
          avatar_url?: string | null;
          is_active?: boolean;
          allowed_statuses?: string[] | null;
          password?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: 'admin' | 'manager' | 'employee';
          team?: 'creative' | 'web';
          join_date?: string;
          avatar_url?: string | null;
          is_active?: boolean;
          allowed_statuses?: string[] | null;
          password?: string | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: string;
          priority: 'low' | 'medium' | 'high';
          assignee_id: string;
          client_id: string;
          team: 'creative' | 'web';
          due_date: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status: string;
          priority: 'low' | 'medium' | 'high';
          assignee_id: string;
          client_id: string;
          team: 'creative' | 'web';
          due_date: string;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: string;
          priority?: 'low' | 'medium' | 'high';
          assignee_id?: string;
          client_id?: string;
          team?: 'creative' | 'web';
          due_date?: string;
          created_at?: string;
          created_by?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          industry: string;
          contact_person: string;
          email: string;
          phone: string;
          date_added: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry: string;
          contact_person: string;
          email: string;
          phone: string;
          date_added: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          industry?: string;
          contact_person?: string;
          email?: string;
          phone?: string;
          date_added?: string;
          created_at?: string;
        };
      };
      teams: {
        Row: {
          id: 'creative' | 'web';
          name: string;
          manager_id: string;
          description: string;
          member_count: number;
          created_at: string;
        };
        Insert: {
          id: 'creative' | 'web';
          name: string;
          manager_id: string;
          description: string;
          member_count: number;
          created_at?: string;
        };
        Update: {
          id?: 'creative' | 'web';
          name?: string;
          manager_id?: string;
          description?: string;
          member_count?: number;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          submitted: boolean;
          approved: boolean | null;
          feedback: string | null;
          tasks: {
            task_id: string;
            hours: number;
            notes: string;
          }[];
          total_hours: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          submitted: boolean;
          approved?: boolean | null;
          feedback?: string | null;
          tasks: {
            task_id: string;
            hours: number;
            notes: string;
          }[];
          total_hours: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          submitted?: boolean;
          approved?: boolean | null;
          feedback?: string | null;
          tasks?: {
            task_id: string;
            hours: number;
            notes: string;
          }[];
          total_hours?: number;
          created_at?: string;
        };
      };
      statuses: {
        Row: {
          id: string;
          name: string;
          team: 'creative' | 'web';
          color: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          team: 'creative' | 'web';
          color: string;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          team?: 'creative' | 'web';
          color?: string;
          order?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
} 