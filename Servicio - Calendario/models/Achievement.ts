export type AchievementType =
  | "primera_tarea"
  | "cinco_tareas"
  | "diez_tareas"
  | "tres_dias_consecutivos";

export interface Achievement {
  achievementId: string; // PK
  userId: string;        // GSI partition key
  type: AchievementType;
  dateUnlocked: string;  // ISO 8601
}

export const ACHIEVEMENT_META: Record<AchievementType, { label: string; description: string; threshold: number }> = {
  primera_tarea:          { label: "Primera Tarea ✨",        description: "Completaste tu primera tarea",          threshold: 1  },
  cinco_tareas:           { label: "Racha de 5 🌸",            description: "5 tareas completadas",                  threshold: 5  },
  diez_tareas:            { label: "Imparable 🦋",             description: "10 tareas completadas",                 threshold: 10 },
  tres_dias_consecutivos: { label: "3 Días Seguidos 🌟",       description: "3 días consecutivos completando tareas", threshold: 3  },
};

// ─── DynamoDB Table Design ─────────────────────────────────────────────────
//
//  Table: AgendaViva-Achievements
//  ┌─────────────────────────────────────────────────────────────┐
//  │  PK: achievementId (String)                                 │
//  │  Attributes: userId, type, dateUnlocked                     │
//  ├─────────────────────────────────────────────────────────────┤
//  │  GSI: userId-index                                          │
//  │    PK: userId                                               │
//  │    → List all achievements for a given user                 │
//  └─────────────────────────────────────────────────────────────┘
