import { SearchInput } from '@/components/common/SearchInput';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onCompose: () => void;
  onCreateAddress: () => void;
}

export function Header({ onSearch, onCompose, onCreateAddress }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex flex-1 items-center">
        {onSearch && (
          <SearchInput
            placeholder="Search emails..."
            onSearch={onSearch}
            className="w-full max-w-md"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCreateAddress}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Address
        </button>

        <button
          onClick={onCompose}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          Compose
        </button>
      </div>
    </header>
  );
}
