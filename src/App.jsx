import { AuthGate } from "./components/auth/AuthGate.jsx";
import { ToastStack } from "./components/common/ToastStack.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
// Base extension styles first
// import "./styles/webmap-extension.css";
// Auth styles last so they can take precedence for auth screens
import "./styles/auth.css";

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <AuthGate />
          <ToastStack />
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;

// 995396404629-4ggkmf588eo1j0qrabiacj145vb9gker.apps.googleusercontent.com
// 995396404629-bvkai45im6a3si3geft64tml6ir82f71.apps.googleusercontent.com
