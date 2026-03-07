import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLES = {
  TASKS: process.env.TASKS_TABLE ?? "AgendaViva-Tasks",
  ACHIEVEMENTS: process.env.ACHIEVEMENTS_TABLE ?? "AgendaViva-Achievements",
} as const;
