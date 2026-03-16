import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  recipients: {
    name: string;
    email: string;
    open_count: number;
    click_count: number;
  }[];
}

export default function TrackingStats({ recipients }: Props) {
  const totalRecipients = recipients.length;
  const opened = recipients.filter((r) => r.open_count > 0).length;
  const clicked = recipients.filter((r) => r.click_count > 0).length;

  const chartData = [
    { name: 'Sent', value: totalRecipients },
    { name: 'Opened', value: opened },
    { name: 'Clicked', value: clicked },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Tracking Stats</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalRecipients}</div>
          <div className="text-xs text-gray-500">Recipients</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {totalRecipients ? Math.round((opened / totalRecipients) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-500">Open Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {totalRecipients ? Math.round((clicked / totalRecipients) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-500">Click Rate</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
