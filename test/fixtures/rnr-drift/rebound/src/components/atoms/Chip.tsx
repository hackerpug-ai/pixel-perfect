// THE FIX, multi-line form. The import list is still wrapped across lines — the
// point is that `mode: "file"` is not merely "flag anything multi-line": it must
// read the specifiers and let a correct wrapped import through.
//
// View stays imported from react-native. It is a free primitive; RNR does not
// replace it, and a contract that flagged it would fire on correct code.
import { View } from 'react-native';
import {
  Button,
  type ButtonProps,
} from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type ChipProps = Omit<ButtonProps, 'children'> & {
  label: string;
  selected?: boolean;
};

export function Chip({ label, selected = false, className, ...rest }: ChipProps) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      size="sm"
      accessibilityState={{ selected }}
      className={cn('gap-2 px-3 py-1', className)}
      {...rest}
    >
      <View className="h-2 w-2 rounded-full bg-foreground" />
      <Text className="text-sm">{label}</Text>
    </Button>
  );
}
