export interface User {
  id: string;
  email: string;
  user_metadata: {
    role: 'student' | 'faculty' | 'admin';
    full_name?: string;
    student_id?: string;
    department?: string;
  };
}

export interface FileMetadata {
  id: string;
  user_id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  uploaded_at: string;
}

export interface Grade {
  id: string;
  user_id: string;
  subject: string;
  grade: number;
  units: number;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  created_at: string;
}

export interface HandbookSection {
  id: string;
  title: string;
  content: string;
  category: string;
  order: number;
  updated_at: string;
  updated_by: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  created_at: string;
}