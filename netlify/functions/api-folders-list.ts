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

  try {
    const { data, error } = await supabase
      .from('address_folders')
      .select('id, name, sort_order, created_at')
      .eq('user_id', auth.userId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return jsonResponse(200, { folders: data });
  } catch (error) {
    console.error('Folder list error:', error);
    return errorResponse(500, 'Failed to list folders');
  }
};
