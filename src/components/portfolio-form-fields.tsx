// Shared dark-theme form field primitives for the Monitoring Dashboard.
// Used by both the company detail tabs and the Add Company form so styling
// stays consistent and doesn't drift between the two.

export const inputCls =
  "h-9 w-full rounded-md border bg-[#0F1B2E] px-2.5 text-sm text-white/90 outline-none focus:border-[#FF7553]";
export const inputStyle = { borderColor: "#1A2B47" };
export const labelCls = "mb-1 block text-[11px] uppercase tracking-wider text-white/40";

export function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        className={inputCls}
        style={inputStyle}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function LabeledTextarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <textarea
        className="w-full resize-none rounded-md border bg-[#0F1B2E] px-2.5 py-2 text-sm text-white/90 outline-none focus:border-[#FF7553]"
        style={inputStyle}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        className={inputCls}
        style={inputStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
