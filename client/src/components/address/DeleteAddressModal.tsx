import { useState, useCallback, useEffect } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface DeleteAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  email: string;
}

export function DeleteAddressModal({ isOpen, onClose, onConfirm, email }: DeleteAddressModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete address');
      setIsDeleting(false);
    }
  }, [onConfirm, onClose]);

  // ESC to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Delete Address</h2>
        </div>

        <p className="mb-2 text-gray-700">
          Delete <span className="font-medium">{email}</span>?
        </p>
        <p className="mb-6 text-sm text-gray-500">
          This will permanently delete <strong>ALL emails</strong> sent to or from this address. This cannot be undone.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                Deleting...
              </>
            ) : (
              'Delete Address'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
