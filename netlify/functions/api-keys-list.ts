import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  authenticateRequest,
  isAuthError,
  supabase,
  jsonResponse,
  errorResponse,
} from './lib/auth.js';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  const auth = await authenticateRequest(event);
  if (isAuthError(auth)) {
    return { statusCode: auth.statusCode, headers: { 'Content-Type': 'application/json' }, body: auth.body };
  }

  if (auth.authMethod !== 'jwt') {
    return errorResponse(403, 'API key management requires JWT authentication');
  }

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, last_used_at, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return jsonResponse(200, { keys: data });
  } catch (error) {
    console.error('API key list error:', error);
    return errorResponse(500, 'Failed to list API keys');
  }
};
