import { useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import EmailPreview from './EmailPreview';
import { uploadImage } from '../api/client';

interface Props {
  initialName?: string;
  initialSubject?: string;
  initialBody?: string;
  onSave: (data: { name: string; subject: string; body_html: string }) => void;
  onCancel: () => void;
}

function ToolbarButton({ active, onClick, children, title }: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded text-sm font-medium min-w-[28px] ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-1" />;
}

export default function TemplateEditor({ initialName = '', initialSubject = '', initialBody = '', onSave, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageWidth, setImageWidth] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('upload');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Color,
      TextStyle,
      Placeholder.configure({ placeholder: 'Start writing your email template...' }),
    ],
    content: initialBody || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  });

  const getHtml = useCallback(() => {
    return editor?.getHTML() || '';
  }, [editor]);

  const handleInsertPlaceholder = (placeholder: string) => {
    editor?.chain().focus().insertContent(placeholder).run();
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
    if (!imageUrl || !editor) return;
    const attrs: Record<string, string> = { src: imageUrl, alt: imageAlt || 'image' };
    if (imageWidth) attrs.width = imageWidth;
    editor.chain().focus().setImage(attrs).run();
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

  const handleInsertLink = () => {
    if (!linkUrl || !editor) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
    setShowLinkModal(false);
  };

  const previewHtml = getHtml()
    .replace(/\{\{username\}\}/g, 'JohnDoe')
    .replace(/\{\{email\}\}/g, 'john@example.com');

  if (!editor) return null;

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>

          {/* Toolbar */}
          <div className="border border-b-0 rounded-t bg-gray-50 px-2 py-1.5 flex flex-wrap items-center gap-0.5">
            {/* Text Style */}
            <select
              className="text-xs border rounded px-1.5 py-1 bg-white"
              value={
                editor.isActive('heading', { level: 1 }) ? 'h1' :
                editor.isActive('heading', { level: 2 }) ? 'h2' :
                editor.isActive('heading', { level: 3 }) ? 'h3' :
                'p'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'p') editor.chain().focus().setParagraph().run();
                else editor.chain().focus().toggleHeading({ level: parseInt(val[1]) as 1 | 2 | 3 }).run();
              }}
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            <ToolbarDivider />

            {/* Formatting */}
            <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
              <span className="underline">U</span>
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
              <span className="line-through">S</span>
            </ToolbarButton>

            <ToolbarDivider />

            {/* Text Color */}
            <div className="relative" title="Text Color">
              <input
                type="color"
                className="w-6 h-6 cursor-pointer border-0 p-0 rounded"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                value={editor.getAttributes('textStyle').color || '#000000'}
              />
            </div>

            <ToolbarDivider />

            {/* Alignment */}
            <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h10M3 18h14"/></svg>
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M5 18h14"/></svg>
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M11 12h10M7 18h14"/></svg>
            </ToolbarButton>

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 6h11M10 12h11M10 18h11"/><text x="2" y="8" fontSize="7" fill="currentColor" stroke="none">1</text><text x="2" y="14" fontSize="7" fill="currentColor" stroke="none">2</text><text x="2" y="20" fontSize="7" fill="currentColor" stroke="none">3</text></svg>
            </ToolbarButton>

            <ToolbarDivider />

            {/* Block */}
            <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/></svg>
            </ToolbarButton>

            <ToolbarDivider />

            {/* Link */}
            <ToolbarButton
              active={editor.isActive('link')}
              onClick={() => {
                if (editor.isActive('link')) {
                  editor.chain().focus().unsetLink().run();
                } else {
                  setLinkUrl('');
                  setShowLinkModal(true);
                }
              }}
              title="Insert Link"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            </ToolbarButton>

            {/* Image */}
            <ToolbarButton onClick={() => setShowImageModal(true)} title="Insert Image">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </ToolbarButton>

            <ToolbarDivider />

            {/* Undo/Redo */}
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a5 5 0 015 5v2M3 10l5-5M3 10l5 5"/></svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H11a5 5 0 00-5 5v2M21 10l-5-5M21 10l-5 5"/></svg>
            </ToolbarButton>

            <ToolbarDivider />

            {/* Placeholders */}
            <button
              className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
              onClick={() => handleInsertPlaceholder('{{username}}')}
              title="Insert username placeholder"
            >
              {'{{username}}'}
            </button>
            <button
              className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
              onClick={() => handleInsertPlaceholder('{{email}}')}
              title="Insert email placeholder"
            >
              {'{{email}}'}
            </button>
          </div>

          {/* Editor */}
          <div className="border rounded-b overflow-auto max-h-[400px]">
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={() => onSave({ name, subject, body_html: getHtml() })}
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

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold">Insert Link</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                className="w-full px-3 py-2 border rounded text-sm"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 border rounded hover:bg-gray-50 text-sm" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50" onClick={handleInsertLink} disabled={!linkUrl}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
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
              <button className="px-4 py-2 border rounded hover:bg-gray-50 text-sm" onClick={resetImageModal}>Cancel</button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50" onClick={handleInsertImage} disabled={!imageUrl || uploading}>Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
