/** A password input with the rule written out (at least 8 characters). */
export function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: 'new-password' | 'current-password';
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label className="mt-4 block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={autoComplete === 'new-password' ? 8 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={autoComplete === 'new-password' ? `${id}-rule` : undefined}
        className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2.5 text-ink focus-visible:outline-accent"
      />
      {autoComplete === 'new-password' && (
        <p id={`${id}-rule`} className="mt-1 text-xs text-ink-3">
          At least 8 characters.
        </p>
      )}
    </>
  );
}
