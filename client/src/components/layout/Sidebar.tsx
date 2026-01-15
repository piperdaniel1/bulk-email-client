import { NavLink } from 'react-router-dom';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuth } from '@/hooks/useAuth';
import { formatEmailAddress } from '@/utils/formatters';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface SidebarProps {
  onCreateAddress: () => void;
}

export function Sidebar({ onCreateAddress }: SidebarProps) {
  const { addresses, loading } = useAddresses();
  const { signOut } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        <h1 className="text-xl font-semibold text-gray-900">Email Client</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            All Inboxes
          </NavLink>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between px-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Addresses
            </h2>
            <button
              onClick={onCreateAddress}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Create new address"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              {addresses.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">No addresses yet</p>
              ) : (
                addresses.map((address) => (
                  <NavLink
                    key={address.id}
                    to={`/address/${address.id}`}
                    className={({ isActive }) =>
                      `block truncate rounded-lg px-3 py-2 text-sm ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                    title={formatEmailAddress(address.local_part, address.domain)}
                  >
                    {address.display_name || address.local_part}
                  </NavLink>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
