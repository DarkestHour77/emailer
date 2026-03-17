import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ContactTable from '../components/ContactTable';
import FilterBar from '../components/FilterBar';
import { getContacts, getFilterOptions, uploadContactsCsv } from '../api/client';
import type { Contact } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [subscribed, setSubscribed] = useState('');
  const [plan, setPlan] = useState('');
  const [planOptions, setPlanOptions] = useState<string[]>([]);
  const [subscribedOptions, setSubscribedOptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (search) params.search = search;
      if (subscribed) params.subscribed = subscribed;
      if (plan) params.plan = plan;
      params.limit = '1000';
      const res = await getContacts(params);
      setContacts(res.data);
    } catch {
      toast.error('Failed to load contacts');
    }
  }, [search, subscribed, plan]);

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
      toast.success(`Loaded ${result.contactCount} contacts`);
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
