# Agent.md: Especificación del Microservicio journal-ms

Referencia oficial para el desarrollo e integración del microservicio de diario emocional.

---

## Arquitectura

El microservicio `journal-ms` gestiona las entradas del diario emocional de cada usuaria. Recibe texto libre, lo envía a Amazon Bedrock (Claude), guarda la entrada con la respuesta empática y expone el historial.

- **Runtime**: NestJS (Node.js 20)
- **Base de datos**: DynamoDB via LocalStack (dev) / AWS (prod)
- **IA**: Amazon Bedrock — modelo Claude (empathetic response)
- **Auth**: Valida tokens JWT preguntando a `auth-ms` via RabbitMQ
- **Mensajería**: RabbitMQ — consume `auth_queue` para validar tokens
- **HTTP**: Endpoints protegidos para crear y consultar entradas

---

## Dependencia con auth-ms

Este microservicio NO valida tokens por sí solo. Antes de procesar cualquier request:

1. Extrae el `Bearer token` del header `Authorization`
2. Envía `{ token }` a `auth-ms` via RabbitMQ con el pattern `auth.validate_token`
3. Si la respuesta es `null`, retorna `401 Unauthorized`
4. Si es válida, usa el `userId` retornado para todas las operaciones

```
journal-ms ──RabbitMQ──► auth-ms (auth.validate_token)
                              │
                              └─► { userId, email, name } | null
```

---

## Estructura de Carpetas

```
journal-ms/
├── src/
│   ├── journal/
│   │   ├── dto/
│   │   │   └── create-entry.dto.ts     # { text: string }
│   │   ├── entities/
│   │   │   └── journal-entry.entity.ts # Schema de la entrada
│   │   ├── guards/
│   │   │   └── auth.guard.ts           # Valida token via RabbitMQ → auth-ms
│   │   ├── journal.controller.ts       # HTTP: GET /journal, POST /journal
│   │   ├── journal.service.ts          # Lógica Bedrock + DynamoDB
│   │   └── journal.module.ts
│   ├── app.module.ts
│   └── main.ts
├── docker-compose.yml                  # LocalStack + RabbitMQ (compartido con auth-ms)
├── Dockerfile
└── Agent.md
```

---

## Esquema DynamoDB

**Tabla**: `JournalEntries`

| Campo        | Tipo   | Rol                            |
|--------------|--------|--------------------------------|
| `entryId`    | String | Partition Key (UUID v4)        |
| `userId`     | String | GSI: `userId-index` (historial)|
| `text`       | String | Texto libre de la usuaria      |
| `aiResponse` | String | Respuesta empática de Claude   |
| `createdAt`  | String | ISO 8601                       |

> El GSI en `userId` permite consultar todas las entradas de una usuaria eficientemente.

### Crear tabla en LocalStack

```bash
aws --endpoint-url=http://localhost:4566 dynamodb create-table `
  --table-name JournalEntries `
  --attribute-definitions `
    AttributeName=entryId,AttributeType=S `
    AttributeName=userId,AttributeType=S `
  --key-schema AttributeName=entryId,KeyType=HASH `
  --global-secondary-indexes file://gsi-journal.json `
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

**Archivo `gsi-journal.json`:**
```json
[{
  "IndexName": "userId-index",
  "KeySchema": [{ "AttributeName": "userId", "KeyType": "HASH" }],
  "Projection": { "ProjectionType": "ALL" },
  "ProvisionedThroughput": { "ReadCapacityUnits": 5, "WriteCapacityUnits": 5 }
}]
```

---

## Endpoints HTTP

Todos los endpoints requieren `Authorization: Bearer <token>` en el header.

| Método | Ruta      | Descripción                                    |
|--------|-----------|------------------------------------------------|
| POST   | /journal  | Crea entrada, llama a Bedrock, retorna respuesta |
| GET    | /journal  | Retorna historial de la usuaria autenticada    |

### POST /journal
```json
// Request
{ "text": "Hoy me sentí muy abrumada con el trabajo..." }

// Response 201
{
  "entryId": "uuid",
  "text": "Hoy me sentí muy abrumada con el trabajo...",
  "aiResponse": "Entiendo que fue un día muy pesado. Es completamente válido sentirse así...",
  "createdAt": "2026-03-07T13:00:00.000Z"
}
```

### GET /journal
```json
// Response 200
[
  {
    "entryId": "uuid",
    "text": "...",
    "aiResponse": "...",
    "createdAt": "..."
  }
]
```

---

## Integración con Bedrock (Claude)

Para dev local, Bedrock no tiene emulador en LocalStack Community. Opciones:

- **Opción A (recomendada para dev)**: Mock del servicio Bedrock — retorna respuesta fija para no bloquear desarrollo
- **Opción B**: Usar credenciales AWS reales con acceso a Bedrock

El servicio debe estar abstraído detrás de un `BedrockService` con un método `getEmpatheticResponse(text: string): Promise<string>` para poder intercambiar fácilmente entre mock y real.

**Prompt base para Claude:**
```
Eres una acompañante empática y cálida. La usuaria escribió en su diario:
"{{text}}"

Responde con empatía, valida sus emociones y ofrece una perspectiva gentil.
Máximo 3 oraciones. No des consejos médicos.
```

---

## Guard de Autenticación (RabbitMQ)

El guard extrae el token del header y consulta a `auth-ms`:

```typescript
// Flujo del guard
const token = request.headers.authorization?.replace('Bearer ', '');
const user = await this.authClient.send('auth.validate_token', { token }).toPromise();
if (!user) throw new UnauthorizedException();
request.user = user; // { userId, email, name }
```

---

## Variables de Entorno

```env
PORT=3001

# DynamoDB
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
DYNAMODB_ENDPOINT=http://localhost:4566

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Bedrock (solo prod / opcional en dev)
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

---

## Dependencias a instalar

```bash
npm install @nestjs/microservices @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb \
  @aws-sdk/client-bedrock-runtime @nestjs/config @nestjs/swagger \
  amqplib amqp-connection-manager class-validator class-transformer rxjs

npm install -D @types/amqplib @types/node typescript
```

---

## Estado de implementación

- [ ] Tabla `JournalEntries` creada en LocalStack
- [ ] Guard de autenticación via RabbitMQ → auth-ms
- [ ] `BedrockService` con mock para dev
- [ ] `POST /journal` — crear entrada con respuesta IA
- [ ] `GET /journal` — historial de la usuaria
- [ ] Swagger configurado en `/docs`
- [ ] Pruebas end-to-end con LocalStack + auth-ms corriendo
