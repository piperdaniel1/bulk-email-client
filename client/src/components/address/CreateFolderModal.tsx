import { useState, useCallback, useEffect } from 'react';
import { useFolders } from '@/contexts/FoldersContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editFolder?: { id: string; name: string } | null;
}

export function CreateFolderModal({ isOpen, onClose, editFolder }: CreateFolderModalProps) {
  const [name, setName] = useState(editFolder?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createFolder, updateFolder } = useFolders();

  const isEditing = !!editFolder;

  // Reset state when modal opens/closes or editFolder changes
  useEffect(() => {
    if (isOpen) {
      setName(editFolder?.name || '');
      setError(null);
    }
  }, [isOpen, editFolder]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Folder name is required');
        return;
      }

      setIsSubmitting(true);

      try {
        if (isEditing && editFolder) {
          await updateFolder(editFolder.id, { name: trimmedName });
        } else {
          await createFolder(trimmedName);
        }
        setName('');
        onClose();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(isEditing ? 'Failed to update folder' : 'Failed to create folder');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, isEditing, editFolder, createFolder, updateFolder, onClose]
  );

  const handleClose = useCallback(() => {
    setName('');
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
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {isEditing ? 'Rename Folder' : 'Create Folder'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="My Folder"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              required
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
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Save' : 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
