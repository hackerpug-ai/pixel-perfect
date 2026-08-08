import { Pressable, Text } from 'react-native';
import { PillButton } from '@/components/atoms/PillButton';

export default { title: 'Components/PillButton', component: PillButton };
export const Default = { args: { children: 'Save' } };
export const RawWrapper = () => (
  <Pressable className="p-2"><Text className="text-sm">raw, but in a story</Text></Pressable>
);
