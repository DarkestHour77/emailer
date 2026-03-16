import { useState } from 'react';

interface Props {
  initialName?: string;
  initialSubject?: string;
  initialBody?: string;
  onSave: (data: { name: string; subject: string; body_html: string }) => void;
  onCancel: () => void;
}

const PLACEHOLDERS = ['{{name}}', '{{email}}', '{{company}}'];

export default function TemplateEditor({ initialName = '', initialSubject = '', initialBody = '', onSave, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBody);

  const insertPlaceholder = (placeholder: string) => {
    setBodyHtml((prev) => prev + placeholder);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
        <input
          className="w-full px-3 py-2 border rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Welcome Email"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input
          className="w-full px-3 py-2 border rounded"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Welcome {{name}}!"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Body (HTML)</label>
        <div className="flex gap-2 mb-2">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => insertPlaceholder(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          className="w-full px-3 py-2 border rounded font-mono text-sm h-64"
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="<h1>Hello {{name}}</h1><p>Welcome to our service!</p>"
        />
      </div>
      <div className="flex gap-3">
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          onClick={() => onSave({ name, subject, body_html: bodyHtml })}
        >
          Save Template
        </button>
        <button
          className="px-4 py-2 border rounded hover:bg-gray-50"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
