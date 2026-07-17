import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getPlivoClient } from './client.js';
import type { PlivoClient, PlivoClientOptions } from './client.js';

const inputSchema = z.object({
  to: z.string().describe('Destination phone number to call, in E.164 format.'),
  answerUrl: z
    .string()
    .describe(
      'Publicly reachable URL Plivo fetches when the call is answered. It must return Plivo answer XML, e.g. <Response><Speak>Hello</Speak></Response>.',
    ),
  from: z
    .string()
    .optional()
    .describe('Caller ID — a Plivo phone number. Defaults to PLIVO_SRC.'),
  answerMethod: z
    .enum(['GET', 'POST'])
    .optional()
    .describe('HTTP method Plivo uses to fetch answerUrl. Defaults to POST.'),
});

const outputSchema = z.object({
  message: z.string(),
  requestUuid: z.string(),
  apiId: z.string(),
});

export function createPlivoMakeCallTool(config?: PlivoClientOptions) {
  let client: PlivoClient | null = null;

  function getClient(): PlivoClient {
    if (!client) {
      client = getPlivoClient(config);
    }
    return client;
  }

  return createTool({
    id: 'plivo-make-call',
    description:
      'Place an outbound phone call with Plivo. On answer, Plivo fetches answerUrl for the call-flow XML. Returns the request UUID; a successful response means the call was queued, not yet answered.',
    inputSchema,
    outputSchema,
    execute: async input => {
      const plivoClient = getClient();
      const from = input.from ?? plivoClient.src;
      if (!from) {
        throw new Error('A caller ID is required. Pass from or set PLIVO_SRC.');
      }

      const response = await fetch(`${plivoClient.baseUrl}/Call/`, {
        method: 'POST',
        headers: {
          Authorization: plivoClient.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: input.to,
          answer_url: input.answerUrl,
          answer_method: input.answerMethod ?? 'POST',
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Plivo Call API request failed (${response.status}): ${detail}`);
      }

      const data = (await response.json()) as { message: string; request_uuid: string; api_id: string };
      return {
        message: data.message,
        requestUuid: data.request_uuid,
        apiId: data.api_id,
      };
    },
  });
}
