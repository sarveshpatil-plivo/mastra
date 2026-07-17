import type { ContextWithMastra, ApiRoute } from '@mastra/core/server';

export interface PlivoInboundSms {
  from: string;
  to: string;
  text: string;
  messageUuid?: string;
  type?: string;
}

export interface PlivoInboundSmsRouteArgs {
  message: PlivoInboundSms;
  context: ContextWithMastra;
}

export interface PlivoInboundSmsRouteOptions {
  /**
   * Route path. Defaults to `/webhooks/plivo/inbound-sms`. Mastra reserves the
   * `/api` prefix for built-in routes, so custom paths must not start with `/api`.
   */
  path?: string;
  /**
   * Defaults to `false`. Plivo's servers cannot present Mastra auth, so the route is
   * open by default; validate authenticity with the `X-Plivo-Signature-V3` header instead.
   */
  requiresAuth?: boolean;
  /** Invoked for each inbound SMS Plivo delivers to the webhook. */
  onMessage?: (args: PlivoInboundSmsRouteArgs) => void | Promise<void>;
}

function stringField(params: Record<string, unknown>, key: string): string {
  const value = params[key];
  return typeof value === 'string' ? value : '';
}

/**
 * An ApiRoute for `server.apiRoutes` that receives inbound SMS from Plivo. Point a Plivo
 * number's message URL at this path in cx.plivo.com; Plivo posts each inbound message here:
 *
 * ```ts
 * export const mastra = new Mastra({
 *   agents: { support },
 *   server: { apiRoutes: [plivoInboundSmsRoute({ onMessage: async ({ message }) => { ... } })] },
 * });
 * ```
 */
export function plivoInboundSmsRoute(options: PlivoInboundSmsRouteOptions = {}): ApiRoute {
  const handler = async (c: ContextWithMastra) => {
    const params: Record<string, unknown> =
      c.req.method === 'GET' ? c.req.query() : await c.req.parseBody().catch(() => ({}));

    const message: PlivoInboundSms = {
      from: stringField(params, 'From'),
      to: stringField(params, 'To'),
      text: stringField(params, 'Text'),
      messageUuid: stringField(params, 'MessageUUID') || undefined,
      type: stringField(params, 'Type') || undefined,
    };

    await options.onMessage?.({ message, context: c });

    return c.body(null, 200);
  };

  return {
    path: options.path ?? '/webhooks/plivo/inbound-sms',
    method: 'POST',
    requiresAuth: options.requiresAuth ?? false,
    handler,
  } as ApiRoute;
}
