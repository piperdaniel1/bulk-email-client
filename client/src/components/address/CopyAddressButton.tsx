import { useClipboard } from '@/hooks/useClipboard';
import { formatEmailAddress } from '@/utils/formatters';

interface CopyAddressButtonProps {
  localPart: string;
  domain: string;
  className?: string;
}

export function CopyAddressButton({ localPart, domain, className = '' }: CopyAddressButtonProps) {
  const { copy, copied } = useClipboard();
  const email = formatEmailAddress(localPart, domain);

  return (
    <button
      onClick={() => copy(email)}
      className={`flex items-center gap-1 text-gray-500 hover:text-gray-700 ${className}`}
      title={copied ? 'Copied!' : 'Copy email address'}
    >
      {copied ? (
        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}
