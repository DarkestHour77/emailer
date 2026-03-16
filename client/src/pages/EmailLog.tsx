import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import TrackingStats from '../components/TrackingStats';
import { getEmails, getEmailDetail } from '../api/client';
import type { Email, EmailDetail } from '../types';

export default function EmailLog() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [detail, setDetail] = useState<EmailDetail | null>(null);

  useEffect(() => {
    getEmails().then(setEmails).catch(() => toast.error('Failed to load emails'));
  }, []);

  const viewDetail = async (id: number) => {
    try {
      const data = await getEmailDetail(id);
      setDetail(data);
    } catch {
      toast.error('Failed to load email details');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Email Log</h2>

      {detail && (
        <div className="mb-6">
          <button
            className="text-sm text-indigo-600 hover:underline mb-2"
            onClick={() => setDetail(null)}
          >
            Back to list
          </button>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold">{detail.subject}</h3>
            <p className="text-sm text-gray-500">
              Sent: {detail.sent_at ? new Date(detail.sent_at).toLocaleString() : 'Pending'} |
              Status: {detail.status}
            </p>
          </div>
          <TrackingStats recipients={detail.recipients} />
          <div className="mt-4 bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Opens</th>
                  <th className="px-4 py-3 text-left">Clicks</th>
                  <th className="px-4 py-3 text-left">First Opened</th>
                  <th className="px-4 py-3 text-left">First Clicked</th>
                </tr>
              </thead>
              <tbody>
                {detail.recipients.map((r) => (
                  <tr key={r.tracking_id} className="border-b">
                    <td className="px-4 py-3">{r.name} &lt;{r.email}&gt;</td>
                    <td className="px-4 py-3">{r.open_count}</td>
                    <td className="px-4 py-3">{r.click_count}</td>
                    <td className="px-4 py-3">
                      {r.opened_at ? new Date(r.opened_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.clicked_at ? new Date(r.clicked_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!detail && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {emails.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">No emails sent yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Recipients</th>
                  <th className="px-4 py-3 text-left">Open Rate</th>
                  <th className="px-4 py-3 text-left">Click Rate</th>
                  <th className="px-4 py-3 text-left">Sent</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => viewDetail(e.id)}
                  >
                    <td className="px-4 py-3 font-medium">{e.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        e.status === 'sent' ? 'bg-green-100 text-green-700' :
                        e.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                        e.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{e.recipientCount}</td>
                    <td className="px-4 py-3">{e.openRate}%</td>
                    <td className="px-4 py-3">{e.clickRate}%</td>
                    <td className="px-4 py-3">
                      {e.sent_at ? new Date(e.sent_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
