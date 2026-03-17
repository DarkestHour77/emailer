import { useState, useEffect } from 'react';
import { getEmails, getEmailDetail } from '../api/client';
import type { Email, EmailDetail } from '../types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

function pct(n: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

export default function EmailLog() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    getEmails()
      .then(setEmails)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const viewDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await getEmailDetail(id);
      setDetail(data);
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  if (detail) {
    const { email, recipients } = detail;
    return (
      <div>
        <button
          className="text-indigo-600 hover:underline text-sm mb-4"
          onClick={() => setDetail(null)}
        >
          &larr; Back to Email Log
        </button>
        <h2 className="text-2xl font-bold mb-2">{email.subject}</h2>
        <div className="flex gap-6 text-sm text-gray-500 mb-6">
          <span>Sent: {formatDate(email.sent_at)}</span>
          <span>Status: <span className={`font-medium ${email.status === 'sent' ? 'text-green-600' : email.status === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>{email.status}</span></span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600">{email.total_recipients}</p>
            <p className="text-sm text-gray-500">Recipients</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{email.total_opens}</p>
            <p className="text-sm text-gray-500">Opened ({pct(email.total_opens, email.total_recipients)})</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{email.total_clicks}</p>
            <p className="text-sm text-gray-500">Clicked ({pct(email.total_clicks, email.total_recipients)})</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Opened</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Opens</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Clicked</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recipients.map((r) => (
                <tr key={r.trackingId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.opened_at ? (
                      <span className="text-green-600">{formatDate(r.opened_at)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{r.open_count}</td>
                  <td className="px-4 py-3">
                    {r.clicked_at ? (
                      <span className="text-blue-600">{formatDate(r.clicked_at)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{r.click_count}</td>
                </tr>
              ))}
              {recipients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No recipients found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Email Log</h2>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : emails.length === 0 ? (
        <p className="text-gray-500 text-sm">No emails sent yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Recipients</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Opens</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Clicks</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {emails.map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => viewDetail(e.id)}
                >
                  <td className="px-4 py-3 font-medium text-indigo-600 hover:underline">{e.subject}</td>
                  <td className="px-4 py-3 text-center">{e.total_recipients}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-green-600">{e.total_opens}</span>
                    <span className="text-gray-400 ml-1">({pct(e.total_opens, e.total_recipients)})</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-blue-600">{e.total_clicks}</span>
                    <span className="text-gray-400 ml-1">({pct(e.total_clicks, e.total_recipients)})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.status === 'sent' ? 'bg-green-100 text-green-700' :
                      e.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(e.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg px-6 py-4">Loading details...</div>
        </div>
      )}
    </div>
  );
}
