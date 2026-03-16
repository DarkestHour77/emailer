interface Props {
  search: string;
  subscribed: string;
  plan: string;
  planOptions: string[];
  subscribedOptions: string[];
  onSearchChange: (v: string) => void;
  onSubscribedChange: (v: string) => void;
  onPlanChange: (v: string) => void;
}

const activeGlow = 'ring-2 ring-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)] border-indigo-400';
const base = 'border rounded text-sm transition-all duration-200';

export default function FilterBar({
  search,
  subscribed,
  plan,
  planOptions,
  subscribedOptions,
  onSearchChange,
  onSubscribedChange,
  onPlanChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <input
        className={`flex-1 min-w-[200px] px-3 py-2 ${base} ${search ? activeGlow : ''}`}
        placeholder="Search username or email..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select
        className={`w-48 px-3 py-2 bg-white ${base} ${subscribed ? activeGlow : ''}`}
        value={subscribed}
        onChange={(e) => onSubscribedChange(e.target.value)}
      >
        <option value="">All Subscribed</option>
        {subscribedOptions.map((v) => (
          <option key={v} value={v}>
            Subscribed: {v}
          </option>
        ))}
      </select>
      <select
        className={`w-48 px-3 py-2 bg-white ${base} ${plan ? activeGlow : ''}`}
        value={plan}
        onChange={(e) => onPlanChange(e.target.value)}
      >
        <option value="">All Plans</option>
        {planOptions.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
