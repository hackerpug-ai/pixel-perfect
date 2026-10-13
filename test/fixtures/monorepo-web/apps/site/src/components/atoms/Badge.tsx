// PLANTED component-contract violation: a bare <button> instead of the vendored
// shadcn Button. Every styling rule passes this file; only the shadcn contract fails it.
export function StatusBadge({ label }: { label: string }) {
  return (
    <button className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-primary-foreground">
      {label}
    </button>
  );
}
