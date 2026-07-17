import type { PlivoClientOptions } from './client.js';
import { createPlivoMakeCallTool } from './make-call.js';
import { createPlivoSendSmsTool } from './send-sms.js';

export function createPlivoTools(config?: PlivoClientOptions) {
  return {
    plivoSendSms: createPlivoSendSmsTool(config),
    plivoMakeCall: createPlivoMakeCallTool(config),
  };
}
