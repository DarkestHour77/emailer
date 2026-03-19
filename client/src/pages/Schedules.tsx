import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getScheduledEmails, cancelScheduledEmail } from '../api/client';
import type { Email } from '../types';

export default function Schedules() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchScheduled = useCallback(async () => {
    try {
      const data = await getScheduledEmails();
      setEmails(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
    const interval = setInterval(fetchScheduled, 30_000);
    return () => clearInterval(interval);
  }, [fetchScheduled]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this scheduled email?')) return;
    setCancellingId(id);
    try {
      await cancelScheduledEmail(id);
      setEmails((prev) => prev.filter((e) => e.id !== id));
      toast.success('Scheduled email cancelled');
    } catch {
      toast.error('Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Scheduled Emails</h2>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : emails.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No scheduled emails</p>
          <p className="text-sm text-gray-400 mt-1">
            Schedule an email from the Compose page to see it here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Recipients</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Scheduled For</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email, idx) => (
                <tr
                  key={email.id}
                  className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{email.subject}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {email.contact_ids?.length ?? 0} contacts
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {email.scheduled_at ? formatDate(email.scheduled_at) : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(email.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                      onClick={() => handleCancel(email.id)}
                      disabled={cancellingId === email.id}
                    >
                      {cancellingId === email.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
