import axios from 'axios';
import type { Contact, ContactsResponse, FilterOptions, Template } from '../types';

const api = axios.create({ baseURL: '/api' });

// Contacts
export const getContacts = (params?: Record<string, string>) =>
  api.get<ContactsResponse>('/contacts', { params }).then((r) => r.data);

export const createContact = (data: Partial<Contact>) =>
  api.post<Contact>('/contacts', data).then((r) => r.data);

export const updateContact = (id: number, data: Partial<Contact>) =>
  api.put<Contact>(`/contacts/${id}`, data).then((r) => r.data);

export const deleteContact = (id: number) =>
  api.delete(`/contacts/${id}`);

export const importContacts = (contacts: Partial<Contact>[]) =>
  api.post('/contacts/import', { contacts }).then((r) => r.data);

export const getFilterOptions = () =>
  api.get<FilterOptions>('/contacts/filters').then((r) => r.data);

// Templates
export const getTemplates = () =>
  api.get<Template[]>('/templates').then((r) => r.data);

export const getTemplate = (id: string) =>
  api.get<Template>(`/templates/${id}`).then((r) => r.data);

export const createTemplate = (data: Partial<Template>) =>
  api.post<Template>('/templates', data).then((r) => r.data);

export const updateTemplate = (id: string, data: Partial<Template>) =>
  api.put<Template>(`/templates/${id}`, data).then((r) => r.data);

export const deleteTemplate = (id: string) =>
  api.delete(`/templates/${id}`);

// Emails
export const sendEmail = (data: {
  contactIds: number[];
  subject: string;
  bodyHtml: string;
  templateId?: string;
}) => api.post('/emails/send', data).then((r) => r.data);

export const previewEmail = (bodyHtml: string, contactId?: number) =>
  api.post<{ html: string }>('/emails/preview', { bodyHtml, contactId }).then((r) => r.data);
