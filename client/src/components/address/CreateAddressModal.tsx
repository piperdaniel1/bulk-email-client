import { useState, useCallback, useEffect } from 'react';
import { useAddresses } from '@/hooks/useAddresses';
import { useClipboard } from '@/hooks/useClipboard';
import { DEFAULT_DOMAIN, EMAIL_ADDRESS_PATTERN } from '@/utils/constants';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface CreateAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAddressModal({ isOpen, onClose }: CreateAddressModalProps) {
  const [localPart, setLocalPart] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createAddress } = useAddresses();
  const { copy, copied } = useClipboard();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!EMAIL_ADDRESS_PATTERN.test(localPart)) {
        setError('Only lowercase letters, numbers, dots, underscores, and hyphens are allowed');
        return;
      }

      setIsCreating(true);

      try {
        const address = await createAddress(localPart, displayName || undefined);
        const fullEmail = `${address.local_part}@${address.domain}`;

        // Auto-copy to clipboard
        await copy(fullEmail);

        // Reset and close
        setLocalPart('');
        setDisplayName('');
        onClose();
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('duplicate') || err.message.includes('unique')) {
            setError('This email address already exists');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to create address');
        }
      } finally {
        setIsCreating(false);
      }
    },
    [localPart, displayName, createAddress, copy, onClose]
  );

  const generateRandom = useCallback(() => {
    const adjectives = ['quick', 'test', 'dev', 'temp', 'demo', 'try', 'new'];
    const nouns = ['inbox', 'mail', 'user', 'account', 'box', 'test', 'app'];
    const random = Math.random().toString(36).substring(2, 6);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    setLocalPart(`${adj}-${noun}-${random}`);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setLocalPart('');
    setDisplayName('');
    setError(null);
    onClose();
  }, [onClose]);

  // ESC to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Create Email Address</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={localPart}
                onChange={(e) => {
                  setLocalPart(e.target.value.toLowerCase());
                  setError(null);
                }}
                placeholder="username"
                className="flex-1 rounded-l-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                required
              />
              <span className="rounded-r-lg border border-l-0 border-gray-300 bg-gray-100 px-3 py-2 text-gray-600">
                @{DEFAULT_DOMAIN}
              </span>
            </div>
            <button
              type="button"
              onClick={generateRandom}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Generate random
            </button>
          </div>

          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Test User"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !localPart}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  Creating...
                </>
              ) : (
                'Create & Copy'
              )}
            </button>
          </div>
        </form>

        {copied && (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Address copied to clipboard!
          </div>
        )}
      </div>
    </div>
  );
}
