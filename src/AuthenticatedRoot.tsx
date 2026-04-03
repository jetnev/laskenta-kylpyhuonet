import App from './App';
import { AuthProvider } from './hooks/use-auth';

export default function AuthenticatedRoot() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
