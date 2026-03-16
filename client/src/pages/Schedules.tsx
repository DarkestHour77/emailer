import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSchedules, cancelSchedule } from '../api/client';

interface Schedule {
  id: number;
  subject: string;
  scheduled_at: string;
  recipientCount: number;
}

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const fetchSchedules = async () => {
    try {
      const data = await getSchedules();
      setSchedules(data);
    } catch {
      toast.error('Failed to load schedules');
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await cancelSchedule(id);
      toast.success('Schedule cancelled');
      fetchSchedules();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Scheduled Emails</h2>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {schedules.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">No scheduled emails.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Recipients</th>
                <th className="px-4 py-3 text-left">Scheduled For</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{s.subject}</td>
                  <td className="px-4 py-3">{s.recipientCount}</td>
                  <td className="px-4 py-3">{new Date(s.scheduled_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={() => handleCancel(s.id)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
