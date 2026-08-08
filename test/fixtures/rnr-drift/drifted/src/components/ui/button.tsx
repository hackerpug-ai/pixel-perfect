// Vendored by `npx @react-native-reusables/cli@latest add button`.
import { Pressable } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva('flex-row items-center justify-center rounded-md', {
  variants: {
    variant: { default: 'bg-primary', outline: 'border border-border bg-background' },
    size: { default: 'h-10 px-4', sm: 'h-8 px-3' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export type ButtonProps = React.ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value="font-medium">
      <Pressable className={cn(buttonVariants({ variant, size }), className)} {...props} />
    </TextClassContext.Provider>
  );
}
