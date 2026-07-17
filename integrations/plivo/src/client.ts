export interface PlivoClientOptions {
  authId?: string;
  authToken?: string;
  src?: string;
}

export interface PlivoClient {
  authId: string;
  authToken: string;
  src?: string;
  authHeader: string;
  baseUrl: string;
}

export function getPlivoClient(config?: PlivoClientOptions): PlivoClient {
  const authId = config?.authId ?? process.env.PLIVO_AUTH_ID;
  const authToken = config?.authToken ?? process.env.PLIVO_AUTH_TOKEN;
  if (!authId || !authToken) {
    throw new Error(
      'Plivo credentials are required. Pass { authId, authToken } or set PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN env vars.',
    );
  }
  const src = config?.src ?? process.env.PLIVO_SRC;
  return {
    authId,
    authToken,
    src,
    authHeader: `Basic ${Buffer.from(`${authId}:${authToken}`).toString('base64')}`,
    baseUrl: `https://api.plivo.com/v1/Account/${authId}`,
  };
}
