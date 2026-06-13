interface FormFieldProps { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode; }

export function FormField({ label, value, onChange, placeholder, type = 'text', icon }: FormFieldProps) {
  return (
    <div>
      <label className="block text-navy-200 text-sm font-medium mb-1.5">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500">{icon}</span>}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`input-field ${icon ? 'pl-10' : ''}`}
        />
      </div>
    </div>
  );
}
