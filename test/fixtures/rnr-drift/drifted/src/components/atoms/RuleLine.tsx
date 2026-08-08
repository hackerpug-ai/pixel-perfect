// A hairline rule. There is no RNR component for this and none is required —
// View is a free primitive. The contract must NOT flag this file.
import { View } from 'react-native';
import { cn } from '@/lib/utils';

export function RuleLine({ className }: { className?: string }) {
  return <View className={cn('h-px w-full bg-border', className)} />;
}
