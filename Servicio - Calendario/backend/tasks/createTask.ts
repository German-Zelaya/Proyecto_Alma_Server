import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { dynamo, TABLES } from "../utils/dynamoClient";
import type { Task, CreateTaskInput } from "../models/Task";

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext?.authorizer?.claims?.sub ?? "demo-user";

  if (!event.body) return response(400, { error: "Request body is required" });

  let input: CreateTaskInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return response(400, { error: "Invalid JSON body" });
  }

  const { title, priority, category, dueDate } = input;

  if (!title?.trim())                                   return response(400, { error: "title is required" });
  if (!["high","medium","low"].includes(priority))      return response(400, { error: "priority must be high | medium | low" });
  if (!["trabajo","autocuidado","crecimiento"].includes(category)) return response(400, { error: "category must be trabajo | autocuidado | crecimiento" });
  if (!dueDate || isNaN(Date.parse(dueDate)))          return response(400, { error: "dueDate must be a valid ISO 8601 date" });

  const task: Task = {
    id:        randomUUID(),
    userId,
    title:     title.trim(),
    priority,
    category,
    completed: false,
    createdAt: new Date().toISOString(),
    dueDate:   new Date(dueDate).toISOString(),
  };

  await dynamo.send(new PutCommand({ TableName: TABLES.TASKS, Item: task }));

  return response(201, { task });
};

/*
──────────────────────────────────────────────
 Example Request
──────────────────────────────────────────────
POST /tasks
{
  "title": "Meditación matutina",
  "priority": "high",
  "category": "autocuidado",
  "dueDate": "2025-07-10T00:00:00Z"
}

──────────────────────────────────────────────
 Example Response  201
──────────────────────────────────────────────
{
  "task": {
    "id": "a3f8d1c2-...",
    "userId": "user-123",
    "title": "Meditación matutina",
    "priority": "high",
    "category": "autocuidado",
    "completed": false,
    "createdAt": "2025-07-10T08:00:00.000Z",
    "dueDate":   "2025-07-10T00:00:00.000Z"
  }
}
*/
