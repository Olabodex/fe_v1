import type { MouseEvent, ReactNode } from "react";
import { ChevronDown, Lock, Minus, Plus } from "lucide-react";

export function ActionButton({
  children,
  onClick,
  disabled,
  tone = "primary",
  full = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "soft" | "danger";
  full?: boolean;
}) {
  return (
    <button type="button" className={`action ${tone} ${full ? "full" : ""}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
}) {
  return (
    <label className={`field ${invalid ? "invalid" : ""}`}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} />
    </label>
  );
}

export function StepperField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
}) {
  const setNextValue = (direction: 1 | -1, event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    const parsed = Number(value);
    const fallback = min ?? 0;
    const current = Number.isFinite(parsed) ? parsed : fallback;
    const bounded = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, current + direction * step));
    onChange(String(bounded));
  };

  return (
    <div className={`field stepper-field ${invalid ? "invalid" : ""}`}>
      <span>{label}</span>
      <div className="input-stepper">
        <button type="button" onClick={(event) => setNextValue(-1, event)} aria-label={`Decrease ${label}`}>
          <Minus size={15} />
        </button>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
        />
        <button type="button" onClick={(event) => setNextValue(1, event)} aria-label={`Increase ${label}`}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      <ChevronDown size={16} />
    </label>
  );
}

export function Section({
  title,
  icon,
  children,
  locked,
  note,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  locked?: boolean;
  note?: string;
  className?: string;
}) {
  return (
    <section className={`section-card ${className} ${locked ? "locked-section" : ""}`}>
      <div className="section-heading">
        {icon}
        <h2>{title}</h2>
      </div>
      <div className="section-inner">{children}</div>
      {locked && (
        <div className="lock-layer">
          <Lock size={32} />
          <span>{note ?? "This section is not open yet."}</span>
        </div>
      )}
    </section>
  );
}
