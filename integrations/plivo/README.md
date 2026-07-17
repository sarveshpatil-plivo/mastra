# @mastra/plivo

Plivo SMS and voice-call tools plus an inbound-SMS webhook route for [Mastra](https://mastra.ai) agents.

## Installation

```bash
npm install @mastra/plivo zod
```

Get your Auth ID and Auth Token from the Plivo console at [cx.plivo.com](https://cx.plivo.com/?utm_source=github&utm_medium=oss&utm_campaign=mastra).

## Quick Start

Use `createPlivoTools()` to get the SMS and call tools with a shared configuration:

```typescript
import { Agent } from '@mastra/core/agent';
import { createPlivoTools } from '@mastra/plivo';

const tools = createPlivoTools();
// Or pass credentials explicitly:
// const tools = createPlivoTools({ authId: 'MA...', authToken: '...', src: '+14150000002' });

const agent = new Agent({
  id: 'messaging-agent',
  name: 'Messaging Agent',
  instructions: 'You can send SMS messages and place phone calls on the user\'s behalf using Plivo.',
  model: 'anthropic/claude-sonnet-4-6',
  tools,
});
```

By default, the tools read `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, and `PLIVO_SRC` from your environment. You can also pass `{ authId, authToken, src }` explicitly.

| Env var | Description |
|---------|-------------|
| `PLIVO_AUTH_ID` | Your Plivo Auth ID (HTTP Basic username) |
| `PLIVO_AUTH_TOKEN` | Your Plivo Auth Token (HTTP Basic password) |
| `PLIVO_SRC` | Default sender ID / caller ID (a Plivo number, short code, or alphanumeric sender) |

## Individual Tools

Each tool can be created independently:

```typescript
import { createPlivoSendSmsTool, createPlivoMakeCallTool } from '@mastra/plivo';

const sendSms = createPlivoSendSmsTool({ authId: 'MA...', authToken: '...' });
const makeCall = createPlivoMakeCallTool(); // uses env vars
```

### Send SMS

```typescript
import { createPlivoSendSmsTool } from '@mastra/plivo';

const sendSms = createPlivoSendSmsTool();

// When called by an agent, accepts:
// - dst (required): destination in E.164; multiple recipients joined with "<"
// - text (required): message body
// - src (optional): sender ID; defaults to PLIVO_SRC
// Returns: message, messageUuid[], apiId
// A successful send means the message was queued, not yet delivered.
```

### Make Call

```typescript
import { createPlivoMakeCallTool } from '@mastra/plivo';

const makeCall = createPlivoMakeCallTool();

// Accepts:
// - to (required): destination in E.164
// - answerUrl (required): URL Plivo fetches on answer; must return Plivo answer XML
// - from (optional): caller ID; defaults to PLIVO_SRC
// - answerMethod (optional): 'GET' | 'POST' (default 'POST')
// Returns: message, requestUuid, apiId
// On answer, Plivo fetches answerUrl for the call-flow XML, e.g.
//   <Response><Speak>Hello from Mastra</Speak></Response>
```

## Inbound SMS Webhook

`plivoInboundSmsRoute()` is an `ApiRoute` for `server.apiRoutes` that receives inbound SMS from Plivo:

```typescript
import { Mastra } from '@mastra/core';
import { plivoInboundSmsRoute } from '@mastra/plivo';

export const mastra = new Mastra({
  agents: { support },
  server: {
    apiRoutes: [
      plivoInboundSmsRoute({
        onMessage: async ({ message, context }) => {
          const agent = context.get('mastra').getAgent('support');
          const reply = await agent.generate(message.text);
          // ...forward reply as an outbound SMS with createPlivoSendSmsTool
        },
      }),
    ],
  },
});
```

Point your Plivo number's **Message URL** at this route's public path (default `/webhooks/plivo/inbound-sms`) in [cx.plivo.com](https://cx.plivo.com/?utm_source=github&utm_medium=oss&utm_campaign=mastra). The route is open by default (`requiresAuth: false`) because Plivo cannot present Mastra auth; validate authenticity with Plivo's `X-Plivo-Signature-V3` header.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `/webhooks/plivo/inbound-sms` | Route path (must not start with `/api`) |
| `requiresAuth` | `boolean` | `false` | Whether Mastra auth is required |
| `onMessage` | `(args) => void \| Promise<void>` | — | Called for each inbound message (`{ from, to, text, messageUuid, type }`) |

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `authId` | `string` | `process.env.PLIVO_AUTH_ID` | Plivo Auth ID |
| `authToken` | `string` | `process.env.PLIVO_AUTH_TOKEN` | Plivo Auth Token |
| `src` | `string` | `process.env.PLIVO_SRC` | Default sender / caller ID |

If credentials are missing, the tool throws a clear error at execution time.

## License

Apache-2.0
