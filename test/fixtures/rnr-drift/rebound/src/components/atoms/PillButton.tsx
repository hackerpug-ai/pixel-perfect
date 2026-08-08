// THE FIX. Same visual contract as the drifted version, but the atom is now a
// themed configuration of the vendored primitive rather than a re-implementation
// of it. TextClassContext cascades, the cva variants apply, and the accessibility
// wiring comes from ui/button.
import { Button, type ButtonProps } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type PillButtonProps = Omit<ButtonProps, 'children'> & {
  children: string;
  variant?: 'primary' | 'quiet';
};

export function PillButton({ children, variant = 'quiet', className, ...rest }: PillButtonProps) {
  return (
    <Button
      variant={variant === 'primary' ? 'default' : 'outline'}
      className={cn('px-4 py-2', className)}
      {...rest}
    >
      <Text className="text-base">{children}</Text>
    </Button>
  );
}
