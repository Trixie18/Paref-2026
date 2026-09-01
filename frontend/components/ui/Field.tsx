import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, htmlFor, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

const inputBase =
  "h-11 w-full rounded-md border bg-surface px-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-navy/30 disabled:bg-background disabled:text-muted";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = "", ...props },
  ref
) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint}>
      <input
        ref={ref}
        id={fieldId}
        className={`${inputBase} ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = "", ...props },
  ref
) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={fieldId}
        className={`min-h-24 w-full rounded-md border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-navy/30 ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className = "", children, ...props },
  ref
) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint}>
      <select
        ref={ref}
        id={fieldId}
        className={`${inputBase} ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
});
