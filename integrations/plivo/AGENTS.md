# AGENTS.md — @mastra/plivo

Integration-specific context for the Plivo package. The host-agnostic Plivo API contracts live
in the Plivo KB; this file records how they map onto Mastra and the decisions made here.

## What this package is

Plivo tools and an inbound webhook for Mastra agents, mirroring the shape of the sibling
`integrations/tavily` package (factory-per-tool + a `create*Tools` aggregator + a `client.ts`)
and the `integrations/livekit` `ApiRoute` webhook pattern (`src/routes.ts`).

- `src/client.ts` — resolves credentials (`authId`/`authToken`/`src`) from options or env,
  builds the HTTP Basic header and the REST base URL.
- `src/send-sms.ts` — `createPlivoSendSmsTool` → `POST Message/`.
- `src/make-call.ts` — `createPlivoMakeCallTool` (outbound call) → `POST Call/`.
- `src/tools.ts` — `createPlivoTools` → `{ plivoSendSms, plivoMakeCall }`.
- `src/routes.ts` — `plivoInboundSmsRoute` → an `ApiRoute` for `server.apiRoutes`.
- `src/index.ts` — public exports.

## Scope decisions

- **Outbound SMS + outbound voice call + inbound SMS.** Inbound-voice answer-XML is intentionally
  out of scope: generating call-flow XML in real time from an LLM is impractical due to latency,
  so it is skipped here.
- No Plivo SDK dependency — the two REST calls use `fetch` with HTTP Basic auth, which keeps the
  package dependency-free (matches how lightweight the surface is).

## Plivo contract (grounded in the Plivo KB)

- Base URL: `https://api.plivo.com/v1/Account/{AUTH_ID}`. Console is **cx.plivo.com** (never
  console.plivo.com).
- Auth: HTTP Basic, Auth ID as username, Auth Token as password.
- **Send SMS:** `POST Message/`, JSON body `{ src, dst, text }`. Success is **HTTP 202** and means
  *queued*, not delivered. Response: `{ message, message_uuid: string[], api_id }`. Multiple `dst`
  recipients are joined with `<`. Wire a delivery-report webhook if delivery status is needed.
- **Make call:** `POST Call/`, JSON body `{ from, to, answer_url, answer_method }`. Success is
  **HTTP 201** and means *queued/fired*, not answered. Response: `{ message, request_uuid, api_id }`.
  On answer, Plivo fetches `answer_url` for call-flow XML.
- **Inbound SMS webhook:** Plivo POSTs (form-encoded by default) `From`, `To`, `Text`,
  `MessageUUID`, `Type` to the number's Message URL. The route reads GET query or POST body,
  normalizes to `{ from, to, text, messageUuid, type }`, and returns `200`.

## Conventions

- Tool `id`s are kebab-case (`plivo-send-sms`, `plivo-make-call`); aggregator keys are camelCase
  (`plivoSendSms`, `plivoMakeCall`) — mirrors tavily.
- Secrets are env placeholders only: `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_SRC`.
- Signup / credentials links in docs use the locked campaign URL
  `https://cx.plivo.com/?utm_source=github&utm_medium=oss&utm_campaign=mastra`.
- The inbound route defaults to `requiresAuth: false` (Plivo cannot present Mastra auth);
  authenticity should be enforced via Plivo's `X-Plivo-Signature-V3` header.
