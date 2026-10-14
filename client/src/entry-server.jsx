import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppRoutes } from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { BookingProvider } from './context/BookingContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

export function render(path) {
  return renderToString(<ToastProvider><AuthProvider><CartProvider><StaticRouter location={path}><BookingProvider><AppRoutes /></BookingProvider></StaticRouter></CartProvider></AuthProvider></ToastProvider>);
}
