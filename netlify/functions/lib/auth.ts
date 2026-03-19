import type { HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthResult {
  userId: string;
  authMethod: 'jwt' | 'apikey';
}

export interface AuthError {
  statusCode: number;
  body: string;
}

export function generateApiKey(): string {
  return 'bec_' + crypto.randomBytes(32).toString('base64url');
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function errorResponse(statusCode: number, message: string) {
  return jsonResponse(statusCode, { error: message });
}

export async function authenticateRequest(
  event: HandlerEvent
): Promise<AuthResult | AuthError> {
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const token = authHeader.slice(7);

  // API key auth: Bearer bec_<key>
  if (token.startsWith('bec_')) {
    const hash = hashApiKey(token);

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id')
      .eq('key_hash', hash)
      .single();

    if (error || !data) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid API key' }) };
    }

    // Fire-and-forget last_used_at update
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then();

    return { userId: data.user_id, authMethod: 'apikey' };
  }

  // JWT auth
  const userSupabase = createClient(
    supabaseUrl,
    process.env.VITE_SUPABASE_ANON_KEY || supabaseServiceKey
  );
  const {
    data: { user },
    error,
  } = await userSupabase.auth.getUser(token);

  if (error || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  return { userId: user.id, authMethod: 'jwt' };
}

export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'statusCode' in result;
}
