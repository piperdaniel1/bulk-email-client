import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  authenticateRequest,
  isAuthError,
  generateApiKey,
  hashApiKey,
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
    const body = JSON.parse(event.body || '{}');
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return errorResponse(400, 'Name is required');
    }
    if (name.length > 100) {
      return errorResponse(400, 'Name must be 100 characters or less');
    }

    // Check max 10 keys per user
    const { count } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId);

    if (count !== null && count >= 10) {
      return errorResponse(400, 'Maximum of 10 API keys allowed');
    }

    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: auth.userId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
      })
      .select('id, name, key_prefix, created_at')
      .single();

    if (error) throw error;

    return jsonResponse(201, {
      id: data.id,
      name: data.name,
      key: rawKey,
      key_prefix: data.key_prefix,
      created_at: data.created_at,
    });
  } catch (error) {
    console.error('API key generation error:', error);
    return errorResponse(500, 'Failed to generate API key');
  }
};
