import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { EmailList } from '@/components/email/EmailList';
import { useAddresses } from '@/hooks/useAddresses';
import { CopyAddressButton } from '@/components/address/CopyAddressButton';
import { DeleteAddressModal } from '@/components/address/DeleteAddressModal';
import { formatEmailAddress } from '@/utils/formatters';

export function AddressInbox() {
  const { addressId } = useParams<{ addressId: string }>();
  const navigate = useNavigate();
  const { addresses, deleteAddress } = useAddresses();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const address = addresses.find((a) => a.id === addressId);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!address) return;
    await deleteAddress(address.id);
    navigate('/');
  }, [address, deleteAddress, navigate]);

  return (
    <AppShell onSearch={handleSearch}>
      <div className="h-full bg-white">
        {address && (
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link
                to="/"
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <h2 className="truncate font-medium text-gray-900">
                  {address.display_name || address.local_part}
                </h2>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm text-gray-500">
                    {formatEmailAddress(address.local_part, address.domain)}
                  </span>
                  <CopyAddressButton
                    localPart={address.local_part}
                    domain={address.domain}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0 rounded p-2 text-sm text-red-600 hover:bg-red-50 sm:px-3 sm:py-1"
              aria-label="Delete Address"
            >
              <svg className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
              <span className="hidden sm:inline">Delete Address</span>
            </button>
          </div>
        )}

        <EmailList addressId={addressId} searchQuery={searchQuery} />
      </div>

      {address && (
        <DeleteAddressModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          email={formatEmailAddress(address.local_part, address.domain)}
        />
      )}
    </AppShell>
  );
}
