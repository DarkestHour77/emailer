import { useState, useRef } from 'react';
import EmailPreview from './EmailPreview';
import { uploadImage } from '../api/client';

interface Props {
  initialName?: string;
  initialSubject?: string;
  initialBody?: string;
  onSave: (data: { name: string; subject: string; body_html: string }) => void;
  onCancel: () => void;
}

const PLACEHOLDERS = ['{{username}}', '{{email}}'];

export default function TemplateEditor({ initialName = '', initialSubject = '', initialBody = '', onSave, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBody);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageWidth, setImageWidth] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('upload');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = bodyHtml.substring(0, start) + text + bodyHtml.substring(end);
      setBodyHtml(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
      }, 0);
    } else {
      setBodyHtml((prev) => prev + text);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      setImageUrl(result.url);
    } catch {
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleInsertImage = () => {
    if (!imageUrl) return;
    const widthAttr = imageWidth ? ` width="${imageWidth}"` : '';
    const alt = imageAlt || 'image';
    const imgTag = `<img src="${imageUrl}" alt="${alt}"${widthAttr} style="max-width:100%;height:auto;" />`;
    insertAtCursor(imgTag);
    resetImageModal();
  };

  const resetImageModal = () => {
    setImageUrl('');
    setImageAlt('');
    setImageWidth('');
    setUploading(false);
    setShowImageModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const previewHtml = bodyHtml
    .replace(/\{\{username\}\}/g, 'JohnDoe')
    .replace(/\{\{email\}\}/g, 'john@example.com');

  return (
    <div className="grid grid-cols-2 gap-6">
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
            placeholder="e.g., Welcome {{username}}!"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body (HTML)</label>
          <div className="flex gap-2 mb-2">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                onClick={() => insertAtCursor(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              onClick={() => setShowImageModal(true)}
            >
              Insert Image
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="w-full px-3 py-2 border rounded font-mono text-sm h-64"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="<h1>Hello {{username}}</h1><p>Welcome to our service!</p>"
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
      <div>
        <EmailPreview html={previewHtml} />
      </div>

      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Insert Image</h3>

            <div className="flex border-b">
              <button
                className={`px-4 py-2 text-sm font-medium -mb-px ${imageTab === 'upload' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                onClick={() => setImageTab('upload')}
              >
                Upload File
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium -mb-px ${imageTab === 'url' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                onClick={() => setImageTab('url')}
              >
                From URL
              </button>
            </div>

            {imageTab === 'upload' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Choose Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploading && <p className="text-sm text-indigo-600 mt-2">Uploading...</p>}
                {imageUrl && !uploading && <p className="text-sm text-green-600 mt-2">Uploaded successfully</p>}
              </div>
            )}

            {imageTab === 'url' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  className="w-full px-3 py-2 border rounded text-sm"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text</label>
              <input
                className="w-full px-3 py-2 border rounded text-sm"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Description of the image"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width (optional)</label>
              <input
                className="w-full px-3 py-2 border rounded text-sm"
                value={imageWidth}
                onChange={(e) => setImageWidth(e.target.value)}
                placeholder="e.g., 600 or 100%"
              />
            </div>
            {imageUrl && (
              <div className="border rounded p-2">
                <p className="text-xs text-gray-500 mb-1">Preview:</p>
                <img
                  src={imageUrl}
                  alt={imageAlt || 'preview'}
                  className="max-w-full max-h-32 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
                onClick={resetImageModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50"
                onClick={handleInsertImage}
                disabled={!imageUrl || uploading}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
