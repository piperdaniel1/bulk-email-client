import { useState } from 'react';
import type { Email } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { AttachmentList } from './AttachmentList';
import { formatDate } from '@/utils/formatters';

interface MessageBubbleProps {
  email: Email;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function MessageBubble({ email, isExpanded = true, onToggle }: MessageBubbleProps) {
  const [showHtml, setShowHtml] = useState(true);
  const isOutbound = email.direction === 'outbound';

  const renderBody = () => {
    if (showHtml && email.body_html) {
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: email.body_html }}
        />
      );
    }
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
        {email.body_text || '(no content)'}
      </pre>
    );
  };

  return (
    <div className={`rounded-lg border ${isOutbound ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'}`}>
      <div
        className="flex cursor-pointer items-start gap-3 p-4"
        onClick={onToggle}
      >
        <Avatar
          name={email.from_name}
          email={email.from_address}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {email.from_name || email.from_address}
              </span>
              {isOutbound && (
                <Badge variant="primary" size="sm">Sent</Badge>
              )}
            </div>
            <span className="flex-shrink-0 text-xs text-gray-500">
              {formatDate(email.received_at)}
            </span>
          </div>

          <div className="text-sm text-gray-600">
            <span>To: </span>
            {email.to_addresses.map((r, i) => (
              <span key={r.email}>
                {r.name || r.email}
                {i < email.to_addresses.length - 1 && ', '}
              </span>
            ))}
          </div>

          {email.cc_addresses && email.cc_addresses.length > 0 && (
            <div className="text-sm text-gray-500">
              <span>Cc: </span>
              {email.cc_addresses.map((r, i) => (
                <span key={r.email}>
                  {r.name || r.email}
                  {i < email.cc_addresses!.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}

          {!isExpanded && (
            <p className="mt-1 truncate text-sm text-gray-500">
              {email.stripped_text || email.body_text || '(no content)'}
            </p>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4">
          {email.body_html && email.body_text && (
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setShowHtml(true)}
                className={`rounded px-2 py-1 text-xs ${
                  showHtml ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                HTML
              </button>
              <button
                onClick={() => setShowHtml(false)}
                className={`rounded px-2 py-1 text-xs ${
                  !showHtml ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Plain Text
              </button>
            </div>
          )}

          {renderBody()}

          <AttachmentList emailId={email.id} />
        </div>
      )}
    </div>
  );
}
