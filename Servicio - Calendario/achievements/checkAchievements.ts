import { EventBridgeEvent } from "aws-lambda";
import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { dynamo, TABLES } from "../utils/dynamoClient";
import { ACHIEVEMENT_META, type Achievement, type AchievementType } from "../models/Achievement";

interface TaskCompletedDetail {
  userId:      string;
  taskId:      string;
  completedAt: string;
}

async function getCompletedTaskCount(userId: string): Promise<number> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLES.TASKS,
      IndexName: "userId-dueDate-index",
      KeyConditionExpression: "userId = :uid",
      FilterExpression: "completed = :true",
      ExpressionAttributeValues: { ":uid": userId, ":true": true },
      Select: "COUNT",
    })
  );
  return result.Count ?? 0;
}

async function getUserAchievements(userId: string): Promise<Achievement[]> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLES.ACHIEVEMENTS,
      IndexName: "userId-index",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );
  return (result.Items ?? []) as Achievement[];
}

async function unlockAchievement(userId: string, type: AchievementType): Promise<Achievement> {
  const achievement: Achievement = {
    achievementId: randomUUID(),
    userId,
    type,
    dateUnlocked: new Date().toISOString(),
  };
  await dynamo.send(new PutCommand({ TableName: TABLES.ACHIEVEMENTS, Item: achievement }));
  return achievement;
}

// Count distinct days on which user completed ≥1 task (simplified consecutive check)
async function getConsecutiveDays(userId: string): Promise<number> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLES.TASKS,
      IndexName: "userId-dueDate-index",
      KeyConditionExpression: "userId = :uid",
      FilterExpression: "completed = :true",
      ExpressionAttributeValues: { ":uid": userId, ":true": true },
      ProjectionExpression: "dueDate",
    })
  );

  const days = new Set(
    (result.Items ?? []).map(i => (i.dueDate as string).split("T")[0])
  );

  const sorted = [...days].sort().reverse(); // newest first
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (sorted[i] === expected.toISOString().split("T")[0]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export const handler = async (
  event: EventBridgeEvent<"TaskCompleted", TaskCompletedDetail>
): Promise<void> => {
  const { userId } = event.detail;

  const [completedCount, existingAchievements, consecutiveDays] = await Promise.all([
    getCompletedTaskCount(userId),
    getUserAchievements(userId),
    getConsecutiveDays(userId),
  ]);

  const unlocked = new Set(existingAchievements.map(a => a.type));

  const candidates: { type: AchievementType; met: boolean }[] = [
    { type: "primera_tarea",          met: completedCount >= 1  },
    { type: "cinco_tareas",           met: completedCount >= 5  },
    { type: "diez_tareas",            met: completedCount >= 10 },
    { type: "tres_dias_consecutivos", met: consecutiveDays >= 3 },
  ];

  const newUnlocks = candidates.filter(c => c.met && !unlocked.has(c.type));

  await Promise.all(newUnlocks.map(c => unlockAchievement(userId, c.type)));

  if (newUnlocks.length > 0) {
    console.log(
      `Achievements unlocked for ${userId}:`,
      newUnlocks.map(c => ACHIEVEMENT_META[c.type].label).join(", ")
    );
  }
};
