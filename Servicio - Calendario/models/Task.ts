export type Priority = "high" | "medium" | "low";
export type Category = "trabajo" | "autocuidado" | "crecimiento";

export interface Task {
  id: string;          // Partition Key (PK)
  userId: string;      // Sort Key / GSI partition key
  title: string;
  priority: Priority;
  category: Category;
  completed: boolean;
  createdAt: string;   // ISO 8601
  dueDate: string;     // ISO 8601 — used for daily GSI queries
  updatedAt?: string;
}

export interface CreateTaskInput {
  userId: string;
  title: string;
  priority: Priority;
  category: Category;
  dueDate: string;
}

// ─── DynamoDB Table Design ─────────────────────────────────────────────────
//
//  Table: AgendaViva-Tasks
//  ┌─────────────────────────────────────────────────────────────┐
//  │  PK: id (String)                                            │
//  │  Attributes: userId, title, priority, category,             │
//  │              completed, createdAt, dueDate, updatedAt       │
//  ├─────────────────────────────────────────────────────────────┤
//  │  GSI: userId-dueDate-index                                  │
//  │    PK: userId   SK: dueDate                                 │
//  │    → Efficient query "all tasks for user on given day"      │
//  └─────────────────────────────────────────────────────────────┘
