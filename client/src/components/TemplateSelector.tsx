import type { Template } from '../types';

interface Props {
  templates: Template[];
  selectedId: number | null;
  onSelect: (template: Template | null) => void;
}

export default function TemplateSelector({ templates, selectedId, onSelect }: Props) {
  return (
    <select
      className="w-full px-3 py-2 border rounded text-sm"
      value={selectedId ?? ''}
      onChange={(e) => {
        const id = e.target.value ? parseInt(e.target.value, 10) : null;
        const template = id ? templates.find((t) => t.id === id) ?? null : null;
        onSelect(template);
      }}
    >
      <option value="">-- Select a template --</option>
      {templates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
