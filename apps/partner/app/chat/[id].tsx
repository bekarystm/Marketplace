import { useLocalSearchParams } from 'expo-router';
import { ChatScreen } from '@marketplace/mobile';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatScreen orderId={id} />;
}
