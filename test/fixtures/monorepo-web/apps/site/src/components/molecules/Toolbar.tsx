// PLANTED styling-contract violation: an inline style object. The shadcn contract
// passes this file (it composes the vendored Button); the Tailwind contract fails it.
import { Button } from "@/components/ui/button";

export function Toolbar() {
  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <Button className="px-3" variant="outline" size="sm">
        Save
      </Button>
    </div>
  );
}
