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
    const body = JSON.parse(event.body || '{}');
    const keyId = body.key_id;

    if (!keyId) {
      return errorResponse(400, 'key_id is required');
    }

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', auth.userId);

    if (error) throw error;

    return jsonResponse(200, { success: true });
  } catch (error) {
    console.error('API key revoke error:', error);
    return errorResponse(500, 'Failed to revoke API key');
  }
};
