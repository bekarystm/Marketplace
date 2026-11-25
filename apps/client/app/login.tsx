import { router } from 'expo-router';
import { LoginScreen } from '@marketplace/mobile';

export default function Login() {
  return <LoginScreen onDone={() => router.back()} />;
}
