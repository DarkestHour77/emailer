import { useDropzone } from 'react-dropzone';

interface UploadedFile {
  id: number;
  filename: string;
  size: number;
}

interface Props {
  files: UploadedFile[];
  onUpload: (files: File[]) => void;
  onRemove: (id: number) => void;
}

export default function AttachmentUploader({ files, onUpload, onRemove }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
          isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-500">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to select'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Max 10MB per file</p>
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
              <span>{f.filename} ({(f.size / 1024).toFixed(1)} KB)</span>
              <button
                className="text-red-500 hover:text-red-700 text-xs"
                onClick={() => onRemove(f.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
