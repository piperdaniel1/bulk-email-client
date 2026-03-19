import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  authenticateRequest,
  isAuthError,
  supabase,
  jsonResponse,
  errorResponse,
} from './lib/auth.js';

const mailgunDomain = process.env.MAILGUN_DOMAIN || 'setdomain.com';

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

    // Validate local_part
    const localPart =
      typeof body.local_part === 'string'
        ? body.local_part.toLowerCase().trim()
        : '';

    if (!localPart) {
      return errorResponse(400, 'local_part is required');
    }
    if (localPart.length > 64) {
      return errorResponse(400, 'local_part must be 64 characters or less');
    }
    if (!/^[a-z0-9._-]+$/.test(localPart)) {
      return errorResponse(400, 'Invalid local_part format');
    }

    // Validate display_name
    const displayName =
      typeof body.display_name === 'string' ? body.display_name.trim() : null;
    if (displayName && displayName.length > 255) {
      return errorResponse(400, 'display_name must be 255 characters or less');
    }

    // Validate folder_id
    const folderId = body.folder_id || null;
    if (folderId) {
      const { data: folder } = await supabase
        .from('address_folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', auth.userId)
        .single();

      if (!folder) {
        return errorResponse(404, 'Folder not found');
      }
    }

    // Compute sort_order
    const { data: existing } = await supabase
      .from('email_addresses')
      .select('sort_order')
      .eq('user_id', auth.userId)
      .eq('folder_id', folderId)
      .order('sort_order', { ascending: false })
      .limit(1);

    // For null folder_id, the .eq('folder_id', null) works with supabase-js
    // but we need to handle it with .is() for null values
    let maxOrder = -1;
    if (folderId) {
      if (existing && existing.length > 0) {
        maxOrder = existing[0].sort_order;
      }
    } else {
      const { data: unfiledExisting } = await supabase
        .from('email_addresses')
        .select('sort_order')
        .eq('user_id', auth.userId)
        .is('folder_id', null)
        .order('sort_order', { ascending: false })
        .limit(1);
      if (unfiledExisting && unfiledExisting.length > 0) {
        maxOrder = unfiledExisting[0].sort_order;
      }
    }

    const { data, error } = await supabase
      .from('email_addresses')
      .insert({
        user_id: auth.userId,
        local_part: localPart,
        domain: mailgunDomain,
        display_name: displayName,
        folder_id: folderId,
        sort_order: maxOrder + 1,
      })
      .select(
        'id, local_part, domain, display_name, folder_id, sort_order, created_at, updated_at'
      )
      .single();

    if (error) {
      if (error.code === '23505') {
        return errorResponse(409, 'Email address already exists');
      }
      throw error;
    }

    return jsonResponse(201, { address: data });
  } catch (error) {
    console.error('Address creation error:', error);
    return errorResponse(500, 'Failed to create address');
  }
};
