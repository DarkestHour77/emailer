import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ContactTable from '../components/ContactTable';
import FilterBar from '../components/FilterBar';
import { getContacts, getFilterOptions, uploadContactsCsv } from '../api/client';
import type { Contact } from '../types';

function MetricCards({ contacts }: { contacts: Contact[] }) {
  const stats = useMemo(() => {
    const total = contacts.length;
    const subscribed = contacts.filter((c) => c.subscribed === 'Yes').length;
    const plusPlan = contacts.filter((c) => c.plan === 'Plus').length;
    const today = new Date().toISOString().slice(0, 10);
    const activeToday = contacts.filter((c) => c.last_login?.startsWith(today)).length;
    return [
      { label: 'Total Contacts', value: total, color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { label: 'Subscribed', value: subscribed, color: 'bg-green-50 text-green-700 border-green-200' },
      { label: 'Plus Plan', value: plusPlan, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      { label: 'Active Today', value: activeToday, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    ];
  }, [contacts]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-lg border p-4 ${s.color}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{s.label}</p>
          <p className="text-2xl font-bold mt-1">{s.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subscribed, setSubscribed] = useState('');
  const [plan, setPlan] = useState('');
  const [planOptions, setPlanOptions] = useState<string[]>([]);
  const [subscribedOptions, setSubscribedOptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getFilterOptions()
      .then((opts) => {
        setPlanOptions(opts.plans);
        setSubscribedOptions(opts.subscribedValues);
      })
      .catch(() => {});
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (subscribed) params.subscribed = subscribed;
      if (plan) params.plan = plan;
      params.limit = '1000';
      const res = await getContacts(params);
      setContacts(res.data);
    } catch {
      toast.error('Failed to load contacts');
    }
  }, [debouncedSearch, subscribed, plan]);

  // Clear selection when dropdown filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [subscribed, plan]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleCompose = () => {
    const ids = Array.from(selectedIds);
    navigate('/compose', { state: { contactIds: ids } });
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    setUploading(true);
    try {
      const text = await file.text();
      const result = await uploadContactsCsv(text);
      toast.success(`${result.newContacts} new, ${result.updatedContacts} updated — ${result.contactCount} total contacts`);
      setSelectedIds(new Set());
      fetchContacts();
      getFilterOptions().then((opts) => {
        setPlanOptions(opts.plans);
        setSubscribedOptions(opts.subscribedValues);
      });
    } catch {
      toast.error('Failed to upload CSV');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contacts</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </div>
      </div>

      <MetricCards contacts={contacts} />

      <FilterBar
        search={search}
        subscribed={subscribed}
        plan={plan}
        planOptions={planOptions}
        subscribedOptions={subscribedOptions}
        onSearchChange={setSearch}
        onSubscribedChange={setSubscribed}
        onPlanChange={setPlan}
      />

      <ContactTable
        contacts={contacts}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button
            className="px-4 py-1.5 bg-white text-indigo-600 rounded-full text-sm font-medium hover:bg-indigo-50"
            onClick={handleCompose}
          >
            Compose Email
          </button>
        </div>
      )}
    </div>
  );
}
