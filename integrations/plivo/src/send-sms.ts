import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getPlivoClient } from './client.js';
import type { PlivoClient, PlivoClientOptions } from './client.js';

const inputSchema = z.object({
  dst: z
    .string()
    .describe('Destination phone number in E.164 format. Multiple recipients are joined with "<".'),
  text: z
    .string()
    .describe('The message body. Up to 1600 GSM (or 737 Unicode) characters; longer messages are segmented.'),
  src: z
    .string()
    .optional()
    .describe('Sender ID — a Plivo phone number, short code, or alphanumeric sender. Defaults to PLIVO_SRC.'),
});

const outputSchema = z.object({
  message: z.string(),
  messageUuid: z.array(z.string()),
  apiId: z.string(),
});

export function createPlivoSendSmsTool(config?: PlivoClientOptions) {
  let client: PlivoClient | null = null;

  function getClient(): PlivoClient {
    if (!client) {
      client = getPlivoClient(config);
    }
    return client;
  }

  return createTool({
    id: 'plivo-send-sms',
    description:
      'Send an SMS with Plivo. Returns the queued message UUIDs. A successful response means the message was queued, not yet delivered — wire a delivery-report webhook if you need delivery status.',
    inputSchema,
    outputSchema,
    execute: async input => {
      const plivoClient = getClient();
      const src = input.src ?? plivoClient.src;
      if (!src) {
        throw new Error('A sender ID is required. Pass src or set PLIVO_SRC.');
      }

      const response = await fetch(`${plivoClient.baseUrl}/Message/`, {
        method: 'POST',
        headers: {
          Authorization: plivoClient.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ src, dst: input.dst, text: input.text }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Plivo Messages API request failed (${response.status}): ${detail}`);
      }

      const data = (await response.json()) as { message: string; message_uuid: string[]; api_id: string };
      return {
        message: data.message,
        messageUuid: data.message_uuid,
        apiId: data.api_id,
      };
    },
  });
}
