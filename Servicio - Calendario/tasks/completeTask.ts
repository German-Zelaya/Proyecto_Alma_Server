import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { dynamo, TABLES } from "../utils/dynamoClient";
import type { Task } from "../models/Task";

const eb = new EventBridgeClient({ region: process.env.AWS_REGION ?? "us-east-1" });

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext?.authorizer?.claims?.sub ?? "demo-user";
  const taskId = event.pathParameters?.taskId;

  if (!taskId) return response(400, { error: "taskId path parameter is required" });

  // Verify task exists and belongs to user
  const existing = await dynamo.send(new GetCommand({ TableName: TABLES.TASKS, Key: { id: taskId } }));
  if (!existing.Item) return response(404, { error: "Task not found" });

  const task = existing.Item as Task;
  if (task.userId !== userId) return response(403, { error: "Forbidden" });
  if (task.completed)         return response(200, { message: "Task already completed", task });

  const updatedAt = new Date().toISOString();

  // Update task to completed
  const updated = await dynamo.send(
    new UpdateCommand({
      TableName: TABLES.TASKS,
      Key: { id: taskId },
      UpdateExpression: "SET completed = :done, updatedAt = :now",
      ExpressionAttributeValues: { ":done": true, ":now": updatedAt },
      ReturnValues: "ALL_NEW",
    })
  );

  const updatedTask = updated.Attributes as Task;

  // Emit event to EventBridge → triggers checkAchievements Lambda
  await eb.send(
    new PutEventsCommand({
      Entries: [{
        Source:       "agenda-viva.tasks",
        DetailType:   "TaskCompleted",
        Detail: JSON.stringify({ userId, taskId, completedAt: updatedAt }),
        EventBusName: process.env.EVENT_BUS_NAME ?? "AgendaVivaEventBus",
      }],
    })
  );

  return response(200, { task: updatedTask });
};

/*
──────────────────────────────────────────────
 Example Request
──────────────────────────────────────────────
PATCH /tasks/a3f8d1c2-.../complete

──────────────────────────────────────────────
 Example Response  200
──────────────────────────────────────────────
{
  "task": {
    "id": "a3f8d1c2-...",
    "userId": "user-123",
    "title": "Meditación matutina",
    "priority": "high",
    "category": "autocuidado",
    "completed": true,
    "createdAt": "2025-07-10T08:00:00.000Z",
    "dueDate":   "2025-07-10T00:00:00.000Z",
    "updatedAt": "2025-07-10T09:30:00.000Z"
  }
}
*/
