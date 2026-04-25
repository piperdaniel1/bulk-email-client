import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ThreadMessages } from '@/components/email/ThreadMessages';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import type { Thread } from '@/types';

export function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) return;

    async function fetchThread() {
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('id', threadId)
        .single();

      if (error || !data) {
        navigate('/');
        return;
      }

      setThread(data);
      setLoading(false);
    }

    fetchThread();
  }, [threadId, navigate]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (!thread || !threadId) {
    return (
      <AppShell>
        <div className="p-8 text-center text-gray-500">Thread not found</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="h-full overflow-y-auto bg-gray-50 p-3 sm:p-4">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to inbox
          </Link>

          <ThreadMessages threadId={threadId} subject={thread.subject} />
        </div>
      </div>
    </AppShell>
  );
}
