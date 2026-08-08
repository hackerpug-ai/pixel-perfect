// RNR's installation instructions tell you to write exactly this import.
// An early draft of the contract flagged it; the contract must NOT flag it.
import { PortalHost } from '@rn-primitives/portal';
import { View } from 'react-native';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1">
      {children}
      <PortalHost />
    </View>
  );
}
