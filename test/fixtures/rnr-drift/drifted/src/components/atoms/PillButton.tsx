// THE DEFECT, single-line form. This is the shape observed in the wild: the
// atom hand-rolls Pressable + Text even though components/ui/button.tsx and
// components/ui/text.tsx are sitting right there, already vendored.
//
// It uses className throughout and hardcodes nothing, so every styling contract
// in the repo passes it. Only the component contract can see the problem.
import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/utils';

export type PillButtonProps = Omit<PressableProps, 'children'> & {
  children: string;
  variant?: 'primary' | 'quiet';
};

export function PillButton({ children, variant = 'quiet', className, ...rest }: PillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'flex-row items-center justify-center rounded-md px-4 py-2',
        variant === 'primary' ? 'bg-primary' : 'border border-border bg-transparent',
        className
      )}
      {...rest}
    >
      <Text className={cn('text-base', variant === 'primary' ? 'text-primary-foreground' : 'text-foreground')}>
        {children}
      </Text>
    </Pressable>
  );
}
