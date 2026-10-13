// Clean: composes the vendored shadcn primitive and styles it with utilities.
import { Button } from "@/components/ui/button";

export function SaveButton({ children }: { children: string }) {
  return (
    <Button className="px-4 py-2" variant="default" size="sm">
      {children}
    </Button>
  );
}
