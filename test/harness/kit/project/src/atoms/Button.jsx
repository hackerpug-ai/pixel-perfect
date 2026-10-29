// Protected source for the kit fixture. The catalog capture renders
// sandbox/stories/atoms/Button/default.txt; this file is what a real change to
// Button would edit. It is hashed before and after every invocation and must
// never be written by a grader or a harness.
export function Button({ variant = "primary", size = "md", children }) {
  return (
    <button type="button" data-variant={variant} data-size={size}>
      {children}
    </button>
  );
}
