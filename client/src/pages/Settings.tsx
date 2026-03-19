import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

async function apiFetch(path: string, token: string, body?: unknown) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function Settings() {
  const { session, signOut } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const token = session?.access_token ?? '';

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('api-keys-list', token);
      setKeys(data.keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setGenerating(true);
    setError(null);
    setNewKey(null);
    try {
      const data = await apiFetch('api-keys-generate', token, {
        name: name.trim(),
      });
      setNewKey(data.key);
      setName('');
      await fetchKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    setError(null);
    try {
      await apiFetch('api-keys-revoke', token, { key_id: keyId });
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key');
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen">
      <aside className="flex h-full w-[25rem] flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-4">
          <h1 className="text-xl font-semibold text-gray-900">Email Client</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Inbox
          </NavLink>
        </nav>
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>

          <section className="mt-8">
            <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
            <p className="mt-1 text-sm text-gray-500">
              Generate API keys to access your folders and addresses from external applications.
            </p>

            {/* Generate form */}
            <form onSubmit={handleGenerate} className="mt-4 flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Key name (e.g. My Integration)"
                maxLength={100}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={generating || !name.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Key'}
              </button>
            </form>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* New key display */}
            {newKey && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  Copy your API key now. It won't be shown again.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono text-gray-900 border border-amber-200 break-all">
                    {newKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-amber-700">
                  Use as: <code className="font-mono">Authorization: ApiKey {newKey.slice(0, 12)}...</code>
                </p>
              </div>
            )}

            {/* Keys list */}
            <div className="mt-6">
              {loading ? (
                <p className="text-sm text-gray-500">Loading keys...</p>
              ) : keys.length === 0 ? (
                <p className="text-sm text-gray-500">No API keys yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Key</th>
                      <th className="pb-2 font-medium">Last Used</th>
                      <th className="pb-2 font-medium">Created</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key.id} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-900">{key.name}</td>
                        <td className="py-3">
                          <code className="font-mono text-gray-500">{key.key_prefix}...</code>
                        </td>
                        <td className="py-3 text-gray-500">
                          {key.last_used_at
                            ? new Date(key.last_used_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="py-3 text-gray-500">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
