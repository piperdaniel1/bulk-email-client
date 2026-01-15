import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { EmailList } from '@/components/email/EmailList';
import { useAddresses } from '@/hooks/useAddresses';
import { CopyAddressButton } from '@/components/address/CopyAddressButton';
import { formatEmailAddress } from '@/utils/formatters';

export function AddressInbox() {
  const { addressId } = useParams<{ addressId: string }>();
  const { addresses, deleteAddress } = useAddresses();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(false);

  const address = addresses.find((a) => a.id === addressId);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!address) return;

    const fullEmail = formatEmailAddress(address.local_part, address.domain);
    if (!confirm(`Are you sure you want to delete ${fullEmail}? All emails will be lost.`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteAddress(address.id);
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to delete address:', err);
      setDeleting(false);
    }
  }, [address, deleteAddress]);

  return (
    <AppShell onSearch={handleSearch}>
      <div className="h-full bg-white">
        {address && (
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h2 className="font-medium text-gray-900">
                  {address.display_name || address.local_part}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
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
              onClick={handleDelete}
              disabled={deleting}
              className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Address'}
            </button>
          </div>
        )}

        <EmailList addressId={addressId} searchQuery={searchQuery} />
      </div>
    </AppShell>
  );
}
