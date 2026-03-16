import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ContactTable from '../components/ContactTable';
import FilterBar from '../components/FilterBar';
import { getContacts, getFilterOptions } from '../api/client';
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

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Contacts</h2>
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
