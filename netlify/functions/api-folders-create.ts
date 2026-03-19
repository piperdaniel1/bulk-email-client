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
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return errorResponse(400, 'Name is required');
    }
    if (name.length > 100) {
      return errorResponse(400, 'Name must be 100 characters or less');
    }

    // Get max sort_order
    const { data: existing } = await supabase
      .from('address_folders')
      .select('sort_order')
      .eq('user_id', auth.userId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const maxOrder = existing && existing.length > 0 ? existing[0].sort_order : -1;

    const { data, error } = await supabase
      .from('address_folders')
      .insert({
        user_id: auth.userId,
        name,
        sort_order: maxOrder + 1,
      })
      .select('id, name, sort_order, created_at')
      .single();

    if (error) throw error;

    return jsonResponse(201, { folder: data });
  } catch (error) {
    console.error('Folder creation error:', error);
    return errorResponse(500, 'Failed to create folder');
  }
};
