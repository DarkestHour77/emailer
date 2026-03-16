import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import TemplateSelector from '../components/TemplateSelector';
import EmailPreview from '../components/EmailPreview';
import AttachmentUploader from '../components/AttachmentUploader';
import ScheduleModal from '../components/ScheduleModal';
import {
  getTemplates,
  getContacts,
  sendEmail,
  scheduleEmail,
  previewEmail,
  uploadFiles,
} from '../api/client';
import type { Template, Contact } from '../types';

interface UploadedFile {
  id: number;
  filename: string;
  size: number;
}

export default function ComposeEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const contactIds: number[] = location.state?.contactIds || [];

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
    if (contactIds.length > 0) {
      getContacts().then((res) => {
        setContacts(res.data.filter((c) => contactIds.includes(c.id)));
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (bodyHtml) {
      previewEmail(bodyHtml, contactIds[0]).then((r) => setPreviewHtml(r.html)).catch(() => {});
    } else {
      setPreviewHtml('');
    }
  }, [bodyHtml]);

  const handleTemplateSelect = (template: Template | null) => {
    setSelectedTemplate(template);
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.body_html);
    }
  };

  const handleUpload = async (files: File[]) => {
    try {
      const uploaded = await uploadFiles(files);
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleSend = async () => {
    if (!subject || !bodyHtml || contactIds.length === 0) {
      toast.error('Subject, body, and recipients are required');
      return;
    }
    setSending(true);
    try {
      await sendEmail({
        contactIds,
        subject,
        bodyHtml,
        templateId: selectedTemplate?.id,
        attachmentIds: attachments.map((a) => a.id),
      });
      toast.success('Email sent!');
      navigate('/emails');
    } catch {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async (scheduledAt: string) => {
    if (!subject || !bodyHtml || contactIds.length === 0) {
      toast.error('Subject, body, and recipients are required');
      return;
    }
    try {
      await scheduleEmail({
        contactIds,
        subject,
        bodyHtml,
        templateId: selectedTemplate?.id,
        attachmentIds: attachments.map((a) => a.id),
        scheduledAt,
      });
      toast.success('Email scheduled!');
      setShowSchedule(false);
      navigate('/schedules');
    } catch {
      toast.error('Failed to schedule');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Compose Email</h2>

      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          Recipients ({contacts.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {contacts.map((c) => (
            <span key={c.id} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
              {c.username} &lt;{c.email}&gt;
            </span>
          ))}
          {contacts.length === 0 && (
            <p className="text-sm text-gray-400">No recipients selected. Go back to Dashboard to select contacts.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
            <TemplateSelector
              templates={templates}
              selectedId={selectedTemplate?.id ?? null}
              onSelect={handleTemplateSelect}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              className="w-full px-3 py-2 border rounded"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body (HTML)</label>
            <textarea
              className="w-full px-3 py-2 border rounded font-mono text-sm h-64"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder="<h1>Hello {{name}}</h1>"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
            <AttachmentUploader
              files={attachments}
              onUpload={handleUpload}
              onRemove={(id) => setAttachments((prev) => prev.filter((f) => f.id !== id))}
            />
          </div>
          <div className="flex gap-3">
            <button
              className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              onClick={handleSend}
              disabled={sending || contactIds.length === 0}
            >
              {sending ? 'Sending...' : 'Send Now'}
            </button>
            <button
              className="px-6 py-2 border rounded hover:bg-gray-50"
              onClick={() => setShowSchedule(true)}
              disabled={contactIds.length === 0}
            >
              Schedule
            </button>
          </div>
        </div>
        <div>
          <EmailPreview html={previewHtml} />
        </div>
      </div>

      {showSchedule && (
        <ScheduleModal
          onSchedule={handleSchedule}
          onCancel={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}
