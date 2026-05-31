/**
 * Request body parser — S2.5 boundary validation.
 *
 * Replaces the `await req.json() as { ... }` pattern across API routes with
 * a Zod-validated `parseBody(schema, body)` call that returns a discriminated
 * union — caller either gets the typed `data` or returns the 400 `response`.
 *
 * Why a discriminated union and not a thrown error: Next.js route handlers
 * already use Response objects for everything else (success and validation
 * failure both flow through `return Response.json(...)`). Throwing would mean
 * try/catch in every route, which adds noise and forces a second decision
 * about HTTP status mapping. The discriminated union keeps validation in the
 * normal return path — type-narrowing on `.ok` is the only ceremony.
 *
 * Error shape: { error: 'Invalid input', issues: [{path, message}] }. The path
 * is the dotted Zod path (e.g. ['cargo', 'commodity']). Frontends can map
 * field-level issues back to their input fields without parsing free text.
 */
import type { ZodIssue, ZodTypeAny } from 'zod'

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response }

/**
 * Validates `body` against `schema`. Returns either the typed parse result or
 * a 400 Response ready to return from the route handler.
 *
 * Typical usage:
 *   const parsed = parseBody(CreateVesselBodySchema, await req.json())
 *   if (!parsed.ok) return parsed.response
 *   const { imo } = parsed.data
 */
export function parseBody<S extends ZodTypeAny>(
  schema: S,
  body: unknown,
): ParseResult<S['_output']> {
  const result = schema.safeParse(body)
  if (result.success) {
    return { ok: true, data: result.data }
  }

  // Flatten Zod's verbose issue tree into {path, message} pairs the frontend
  // can render at the field level. We deliberately do NOT include
  // `received`/`expected` from the issue — those can leak internal types.
  const issues = result.error.issues.map((issue: ZodIssue) => ({
    path: issue.path,
    message: issue.message,
  }))

  return {
    ok: false,
    response: Response.json(
      { error: 'Invalid input', issues },
      { status: 400 },
    ),
  }
}
