import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreateEntryDto } from './dto/create-entry.dto';
import { BedrockService } from './bedrock.service';
import { JournalEntry } from './entities/journal-entry.entity';

@Injectable()
export class JournalService {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName = 'JournalEntries';

  constructor(
    private readonly configService: ConfigService,
    private readonly bedrockService: BedrockService,
  ) {
    const client = new DynamoDBClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      endpoint: this.configService.get<string>('DYNAMODB_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', 'test'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', 'test'),
      },
    });
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async createEntry(userId: string, dto: CreateEntryDto): Promise<Partial<JournalEntry>> {
    const entryId = uuidv4();
    const createdAt = new Date().toISOString();
    const aiResponse = await this.bedrockService.getEmpatheticResponse(dto.text);

    const entry: JournalEntry = { entryId, userId, text: dto.text, aiResponse, createdAt };

    await this.docClient.send(
      new PutCommand({ TableName: this.tableName, Item: entry }),
    );

    return { entryId, text: dto.text, aiResponse, createdAt };
  }

  async getEntries(userId: string): Promise<Partial<JournalEntry>[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }),
    );

    return (result.Items ?? []).map(({ entryId, text, aiResponse, createdAt }) => ({
      entryId,
      text,
      aiResponse,
      createdAt,
    }));
  }
}
