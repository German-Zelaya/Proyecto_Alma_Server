import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../utils/dynamoClient";
import type { Task } from "../models/Task";

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext?.authorizer?.claims?.sub ?? "demo-user";

  // Allow ?date=2025-07-10 param to query a specific day; defaults to today
  const dateParam = event.queryStringParameters?.date ?? new Date().toISOString().split("T")[0];

  if (isNaN(Date.parse(dateParam))) {
    return response(400, { error: "date query param must be a valid date (YYYY-MM-DD)" });
  }

  // Query GSI: userId-dueDate-index
  // dueDate is stored as full ISO string; we filter by date prefix using begins_with
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLES.TASKS,
      IndexName: "userId-dueDate-index",
      KeyConditionExpression: "userId = :uid AND begins_with(dueDate, :date)",
      ExpressionAttributeValues: {
        ":uid":  userId,
        ":date": dateParam,
      },
      ScanIndexForward: true,
    })
  );

  const tasks = (result.Items ?? []) as Task[];

  // Sort: incomplete first, then by priority weight
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return priorityWeight[a.priority] - priorityWeight[b.priority];
  });

  return response(200, {
    tasks,
    total:     tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending:   tasks.filter(t => !t.completed).length,
    date:      dateParam,
  });
};

/*
──────────────────────────────────────────────
 Example Request
──────────────────────────────────────────────
GET /tasks
GET /tasks?date=2025-07-10

──────────────────────────────────────────────
 Example Response  200
──────────────────────────────────────────────
{
  "tasks": [
    {
      "id": "a3f8d1c2-...",
      "userId": "user-123",
      "title": "Meditación matutina",
      "priority": "high",
      "category": "autocuidado",
      "completed": false,
      "createdAt": "2025-07-10T08:00:00.000Z",
      "dueDate":   "2025-07-10T00:00:00.000Z"
    }
  ],
  "total": 1,
  "completed": 0,
  "pending": 1,
  "date": "2025-07-10"
}
*/
