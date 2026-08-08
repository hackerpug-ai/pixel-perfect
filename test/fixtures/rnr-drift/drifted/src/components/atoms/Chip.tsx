// THE DEFECT, multi-line form. Identical drift to PillButton, but the import
// list is wrapped across lines — which is what a formatter produces the moment
// the specifiers exceed the print width.
//
// This file is the regression guard for `mode: "file"`. A per-line regex scan
// structurally cannot match an import statement spread over five lines, so a
// content-mode check would report this file clean and the gate would be trivially
// defeated by running prettier.
import {
  Pressable,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import { cn } from '@/lib/utils';

export type ChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  selected?: boolean;
};

export function Chip({ label, selected = false, className, ...rest }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn('flex-row items-center gap-2 rounded-md px-3 py-1', selected && 'bg-accent', className)}
      {...rest}
    >
      <View className="h-2 w-2 rounded-full bg-foreground" />
      <Text className="text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}
