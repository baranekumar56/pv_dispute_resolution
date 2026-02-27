import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import { AuthProvider } from './features/auth/components/AuthProvider';
import AppRoutes from './app/routes';
import './styles/globals.css';

const App = () => (
  <Provider store={store}>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </Provider>
);

export default App;
