interface Props {
  html: string;
}

export default function EmailPreview({ html }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-2">Preview</h3>
      <div className="border rounded p-4">
        <iframe
          srcDoc={html}
          title="Email Preview"
          className="w-full min-h-[400px] border-0"
          sandbox=""
        />
      </div>
    </div>
  );
}
