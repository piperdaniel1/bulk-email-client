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
    const body = JSON.parse(event.body || '{}');

    let query = supabase
      .from('email_addresses')
      .select(
        'id, local_part, domain, display_name, folder_id, sort_order, created_at, updated_at'
      )
      .eq('user_id', auth.userId);

    // Filter by folder_id if the field is present in the request body
    if ('folder_id' in body) {
      if (body.folder_id === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', body.folder_id);
      }
    }

    const { data, error } = await query
      .order('folder_id', { ascending: true, nullsFirst: true })
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return jsonResponse(200, { addresses: data });
  } catch (error) {
    console.error('Address list error:', error);
    return errorResponse(500, 'Failed to list addresses');
  }
};
