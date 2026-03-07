import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
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
  const taskId = event.pathParameters?.taskId;

  if (!taskId) return response(400, { error: "taskId path parameter is required" });

  const existing = await dynamo.send(new GetCommand({ TableName: TABLES.TASKS, Key: { id: taskId } }));
  if (!existing.Item) return response(404, { error: "Task not found" });

  const task = existing.Item as Task;
  if (task.userId !== userId) return response(403, { error: "Forbidden" });

  await dynamo.send(new DeleteCommand({ TableName: TABLES.TASKS, Key: { id: taskId } }));

  return response(200, { message: "Task deleted successfully", taskId });
};

/*
──────────────────────────────────────────────
 Example Request
──────────────────────────────────────────────
DELETE /tasks/a3f8d1c2-...

──────────────────────────────────────────────
 Example Response  200
──────────────────────────────────────────────
{
  "message": "Task deleted successfully",
  "taskId": "a3f8d1c2-..."
}
*/
