import { SearchInput } from '@/components/common/SearchInput';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onCompose: () => void;
  onCreateAddress: () => void;
  onOpenSidebar?: () => void;
}

export function Header({ onSearch, onCompose, onCreateAddress, onOpenSidebar }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 sm:px-4">
      {onOpenSidebar && (
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <div className="flex min-w-0 flex-1 items-center">
        {onSearch && (
          <SearchInput
            placeholder="Search..."
            onSearch={onSearch}
            className="w-full max-w-md"
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onCreateAddress}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:px-3"
          aria-label="New Address"
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
          <span className="hidden sm:inline">New Address</span>
        </button>

        <button
          onClick={onCompose}
          className="flex items-center gap-2 rounded-lg bg-blue-600 p-2 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
          aria-label="Compose"
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
          <span className="hidden sm:inline">Compose</span>
        </button>
      </div>
    </header>
  );
}
