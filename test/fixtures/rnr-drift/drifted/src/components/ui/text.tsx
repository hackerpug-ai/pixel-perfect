// Vendored by `npx @react-native-reusables/cli@latest add text`.
// This file legitimately imports the raw primitive — that is its job.
// The contract must NOT flag anything under **/ui/**.
import * as React from 'react';
import { Text as RNText } from 'react-native';
import { cn } from '@/lib/utils';

export const TextClassContext = React.createContext<string | undefined>(undefined);

export function Text({ className, ...props }: React.ComponentProps<typeof RNText>) {
  const context = React.useContext(TextClassContext);
  return <RNText className={cn('text-base text-foreground', context, className)} {...props} />;
}
