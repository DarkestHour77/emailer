import axios from 'axios';
import type { Contact, ContactsResponse, FilterOptions, Template, Email, EmailDetail } from '../types';

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

export const getTemplate = (id: number) =>
  api.get<Template>(`/templates/${id}`).then((r) => r.data);

export const createTemplate = (data: Partial<Template>) =>
  api.post<Template>('/templates', data).then((r) => r.data);

export const updateTemplate = (id: number, data: Partial<Template>) =>
  api.put<Template>(`/templates/${id}`, data).then((r) => r.data);

export const deleteTemplate = (id: number) =>
  api.delete(`/templates/${id}`);

// Emails
export const sendEmail = (data: {
  contactIds: number[];
  subject: string;
  bodyHtml: string;
  templateId?: number;
  attachmentIds?: number[];
}) => api.post('/emails/send', data).then((r) => r.data);

export const previewEmail = (bodyHtml: string, contactId?: number) =>
  api.post<{ html: string }>('/emails/preview', { bodyHtml, contactId }).then((r) => r.data);

export const scheduleEmail = (data: {
  contactIds: number[];
  subject: string;
  bodyHtml: string;
  templateId?: number;
  attachmentIds?: number[];
  scheduledAt: string;
}) => api.post('/emails/schedule', data).then((r) => r.data);

export const getEmails = () =>
  api.get<Email[]>('/emails').then((r) => r.data);

export const getEmailDetail = (id: number) =>
  api.get<EmailDetail>(`/emails/${id}`).then((r) => r.data);

// Schedules
export const getSchedules = () =>
  api.get('/schedules').then((r) => r.data);

export const reschedule = (id: number, scheduledAt: string) =>
  api.put(`/schedules/${id}`, { scheduledAt }).then((r) => r.data);

export const cancelSchedule = (id: number) =>
  api.delete(`/schedules/${id}`);

// Uploads
export const uploadFiles = (files: File[]) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  return api.post<{ id: number; filename: string; size: number }[]>('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
