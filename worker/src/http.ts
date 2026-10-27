export const MAX_BODY_BYTES = 64 * 1024;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  // 204 responses must not have a body.
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function errorResponse(e: HttpError): Response {
  return json(e.status, { error: e.code });
}

/** Parse a JSON body, rejecting oversized or malformed requests. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'too_large');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

export function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

/** SQLite-style UTC timestamp: "YYYY-MM-DD HH:MM:SS". */
export function sqlTime(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
