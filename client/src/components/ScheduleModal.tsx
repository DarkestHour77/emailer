import { useState } from 'react';

interface Props {
  onSchedule: (scheduledAt: string) => void;
  onCancel: () => void;
}

export default function ScheduleModal({ onSchedule, onCancel }: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = () => {
    if (!date || !time) return;
    const scheduled = new Date(`${date}T${time}`);
    if (scheduled.getTime() <= Date.now()) {
      alert('Please select a future date and time');
      return;
    }
    onSchedule(scheduled.toISOString());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Schedule Email</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="time"
              className="w-full px-3 py-2 border rounded"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!date || !time}
          >
            Schedule
          </button>
          <button
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
