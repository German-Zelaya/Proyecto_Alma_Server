import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../utils/dynamoClient";
import type { Task } from "../models/Task";

const OVERLOAD_THRESHOLD = 8;

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}

function getTipByCount(count: number): string {
  if (count > 12) return "¡Tu agenda está saturada! Cancela o pospone al menos la mitad de tus tareas.";
  if (count > 10) return "Demasiadas tareas activas. Elige solo las 3 más importantes para hoy.";
  return "Tienes muchas tareas hoy. Intenta priorizar solo las más importantes.";
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext?.authorizer?.claims?.sub ?? "demo-user";
  const today  = new Date().toISOString().split("T")[0];

  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLES.TASKS,
      IndexName: "userId-dueDate-index",
      KeyConditionExpression: "userId = :uid AND begins_with(dueDate, :date)",
      FilterExpression: "completed = :false",
      ExpressionAttributeValues: {
        ":uid":   userId,
        ":date":  today,
        ":false": false,
      },
      Select: "COUNT",
    })
  );

  const activeTasks = result.Count ?? 0;
  const overloaded  = activeTasks > OVERLOAD_THRESHOLD;

  return response(200, {
    overloaded,
    activeTasks,
    threshold: OVERLOAD_THRESHOLD,
    message: overloaded
      ? getTipByCount(activeTasks)
      : `Tienes ${activeTasks} tarea${activeTasks === 1 ? "" : "s"} activa${activeTasks === 1 ? "" : "s"} hoy. ¡Vas bien! 💜`,
  });
};

/*
──────────────────────────────────────────────
 Example Response — overloaded
──────────────────────────────────────────────
{
  "overloaded": true,
  "activeTasks": 11,
  "threshold": 8,
  "message": "Tienes muchas tareas hoy. Intenta priorizar solo las más importantes."
}

──────────────────────────────────────────────
 Example Response — under threshold
──────────────────────────────────────────────
{
  "overloaded": false,
  "activeTasks": 5,
  "threshold": 8,
  "message": "Tienes 5 tareas activas hoy. ¡Vas bien! 💜"
}
*/
