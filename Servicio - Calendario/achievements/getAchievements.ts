import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../utils/dynamoClient";
import { ACHIEVEMENT_META, type Achievement } from "../models/Achievement";

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext?.authorizer?.claims?.sub ?? "demo-user";

  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLES.ACHIEVEMENTS,
      IndexName: "userId-index",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );

  const achievements = (result.Items ?? []) as Achievement[];

  // Enrich with metadata for display
  const enriched = achievements.map(a => ({
    ...a,
    label:       ACHIEVEMENT_META[a.type]?.label       ?? a.type,
    description: ACHIEVEMENT_META[a.type]?.description ?? "",
  }));

  return response(200, {
    achievements: enriched,
    total: enriched.length,
  });
};

/*
──────────────────────────────────────────────
 Example Response  200
──────────────────────────────────────────────
{
  "achievements": [
    {
      "achievementId": "550e8400-...",
      "userId": "user-123",
      "type": "primera_tarea",
      "dateUnlocked": "2025-07-10T09:30:00.000Z",
      "label": "Primera Tarea ✨",
      "description": "Completaste tu primera tarea"
    },
    {
      "achievementId": "660e8400-...",
      "userId": "user-123",
      "type": "cinco_tareas",
      "dateUnlocked": "2025-07-12T14:15:00.000Z",
      "label": "Racha de 5 🌸",
      "description": "5 tareas completadas"
    }
  ],
  "total": 2
}
*/
