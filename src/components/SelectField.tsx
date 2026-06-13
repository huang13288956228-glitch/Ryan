interface SelectFieldProps { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; }

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-navy-200 text-sm font-medium mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input-field">
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}
