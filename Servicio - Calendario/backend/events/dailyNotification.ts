import { ScheduledEvent } from "aws-lambda";
import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { dynamo, TABLES } from "../utils/dynamoClient";
import type { Task } from "../models/Task";

const sns = new SNSClient({ region: process.env.AWS_REGION ?? "us-east-1" });

/**
 * Triggered by EventBridge Scheduler — runs every evening at 20:00 (local TZ).
 *
 * EventBridge rule (cron):
 *   cron(0 20 * * ? *)
 *
 * For each user with pending tasks today, publishes an SNS notification.
 */
export const handler = async (_event: ScheduledEvent): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  console.log(`[dailyNotification] Running for date: ${today}`);

  // NOTE: In production, iterate over users via Cognito or a Users table.
  // Here we scan tasks to get distinct userIds with pending tasks today.
  const result = await dynamo.send(
    new ScanCommand({
      TableName: TABLES.TASKS,
      FilterExpression: "begins_with(dueDate, :date) AND completed = :false",
      ExpressionAttributeValues: { ":date": today, ":false": false },
      ProjectionExpression: "userId, title, priority",
    })
  );

  const items = (result.Items ?? []) as Pick<Task, "userId" | "title" | "priority">[];

  // Group by userId
  const byUser = items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.userId] = acc[item.userId] ?? [];
    acc[item.userId].push(item);
    return acc;
  }, {});

  // Publish one SNS message per user
  for (const [userId, tasks] of Object.entries(byUser)) {
    const highCount = tasks.filter(t => t.priority === "high").length;
    const message = [
      `🌙 Agenda Viva — Resumen del día`,
      ``,
      `Tienes ${tasks.length} tarea${tasks.length === 1 ? "" : "s"} pendiente${tasks.length === 1 ? "" : "s"} hoy.`,
      highCount > 0 ? `⚡ ${highCount} tarea${highCount === 1 ? "" : "s"} de alta prioridad sin completar.` : "",
      ``,
      `¡Todavía estás a tiempo! Abre tu agenda y cierra el día con intención. 💜`,
    ].filter(Boolean).join("\n");

    await sns.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Message:  message,
        Subject:  `Agenda Viva — ${tasks.length} tarea${tasks.length === 1 ? "" : "s"} pendiente${tasks.length === 1 ? "" : "s"}`,
        MessageAttributes: {
          userId: { DataType: "String", StringValue: userId },
        },
      })
    );

    console.log(`[dailyNotification] Notification sent to userId: ${userId} — ${tasks.length} pending tasks`);
  }
};
