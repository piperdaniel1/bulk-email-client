import { Link } from 'react-router-dom';
import type { Email, Thread } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { formatShortDate, truncate, stripHtml } from '@/utils/formatters';

interface EmailListItemProps {
  thread: Thread & { latest_email?: Email; unread_count: number };
}

export function EmailListItem({ thread }: EmailListItemProps) {
  const email = thread.latest_email;

  if (!email) return null;

  const isUnread = thread.unread_count > 0;
  const preview = email.stripped_text || email.body_text || (email.body_html ? stripHtml(email.body_html) : '');
  const displayName = email.direction === 'inbound'
    ? (email.from_name || email.from_address)
    : `To: ${email.to_addresses[0]?.email || 'unknown'}`;

  return (
    <Link
      to={`/thread/${thread.id}`}
      className={`block border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 ${
        isUnread ? 'bg-blue-50/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar
          name={email.from_name}
          email={email.from_address}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {displayName}
            </span>
            <span className="flex-shrink-0 text-xs text-gray-500">
              {formatShortDate(email.received_at)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`truncate text-sm ${isUnread ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
              {thread.subject || '(no subject)'}
            </span>
            {thread.message_count > 1 && (
              <Badge variant="default" size="sm">
                {thread.message_count}
              </Badge>
            )}
          </div>

          <p className="truncate text-sm text-gray-500">
            {truncate(preview, 100)}
          </p>

          {email.email_address && (
            <div className="mt-1">
              <Badge variant="primary" size="sm">
                {email.email_address.display_name || email.email_address.local_part}
              </Badge>
            </div>
          )}
        </div>

        {isUnread && (
          <div className="flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-blue-600" />
          </div>
        )}
      </div>
    </Link>
  );
}
