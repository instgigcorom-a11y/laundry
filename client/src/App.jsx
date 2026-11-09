import { lazy, Suspense, useContext, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import { BookingProvider } from "./context/BookingContext";
import { Layout } from "./components/layout";
const ForgotPasswordPage = lazy(() => import('./pages/AuthPages.jsx').then(module => ({ default: module.ForgotPasswordPage })));
const LoginPage = lazy(() => import('./pages/AuthPages.jsx').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages.jsx').then(module => ({ default: module.RegisterPage })));
const AccountPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.AccountPage })));
const ProductsPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.ProductsPage })));
const CartPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.CartPage })));
const SchedulePage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.SchedulePage })));
const AddressPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.AddressPage })));
const AddressFormPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.AddressFormPage })));
const PaymentMethodPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.PaymentMethodPage })));
const ConfirmationPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.ConfirmationPage })));
const OrdersPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.OrdersPage })));
const PaymentPage = lazy(() => import('./pages/CustomerPages.jsx').then(module => ({ default: module.PaymentPage })));
const AdminBillingSettings = lazy(() => import('./pages/AdminPages.jsx').then(module => ({ default: module.AdminBillingSettings })));
const AdminCustomers = lazy(() => import('./pages/AdminPages.jsx').then(module => ({ default: module.AdminCustomers })));
const AdminDashboard = lazy(() => import('./pages/AdminPages.jsx').then(module => ({ default: module.AdminDashboard })));
const AdminOrders = lazy(() => import('./pages/AdminPages.jsx').then(module => ({ default: module.AdminOrders })));
const AdminUsers = lazy(() => import('./pages/AdminPages.jsx').then(module => ({ default: module.AdminUsers })));
const AdminInvoices = lazy(() => import('./pages/AdminInvoicesPage.jsx').then(module => ({ default: module.AdminInvoicesPage })));
const AdminServices = lazy(() => import('./pages/AdminServices.jsx').then(module => ({ default: module.AdminServices })));
import { publicPages } from './data/publicPages.js';
import { PublicContentPage } from './pages/PublicPages.jsx';
import { updateRouteMetadata } from './data/seo.js';
function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => { updateRouteMetadata(pathname); }, [pathname]);
  return null;
}
function Guard({ admin = false, children }) { const { user, loading } = useContext(AuthContext); const location = useLocation(); if (loading) return <p className="state">Loading application...</p>; if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />; if (admin && user.role !== "admin") return <Navigate to="/products" replace />; if (!admin && user.role === "admin") return <Navigate to="/admin" replace />; return <Layout>{children}</Layout>; }
function PublicPage({ children }) { const { user } = useContext(AuthContext); if (user?.role === "admin") return <Navigate to="/admin" replace />; return <Layout>{children}</Layout>; }
export function AppRoutes() { return <><RouteMetadata /><Suspense fallback={<p className="state" role="status">Loading page...</p>}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} />{publicPages.map(page => <Route key={page.path} path={page.path} element={<PublicPage><PublicContentPage page={page} /></PublicPage>} />)}<Route path="/products" element={<PublicPage><ProductsPage /></PublicPage>} /><Route path="/cart" element={<Guard><CartPage /></Guard>} /><Route path="/schedule" element={<Guard><SchedulePage /></Guard>} /><Route path="/addresses" element={<Guard><AddressPage /></Guard>} /><Route path="/addresses/new" element={<Guard><AddressFormPage /></Guard>} /><Route path="/payment-method" element={<Guard><PaymentMethodPage /></Guard>} /><Route path="/confirmation/:id" element={<Guard><ConfirmationPage /></Guard>} /><Route path="/orders" element={<Guard><OrdersPage /></Guard>} /><Route path="/account" element={<Guard><AccountPage /></Guard>} /><Route path="/payment/:id" element={<Guard><PaymentPage /></Guard>} /><Route path="/admin" element={<Guard admin><AdminDashboard /></Guard>} /><Route path="/admin/users" element={<Guard admin><AdminUsers /></Guard>} /><Route path="/admin/customers" element={<Guard admin><AdminCustomers /></Guard>} /><Route path="/admin/invoices" element={<Guard admin><AdminInvoices /></Guard>} /><Route path="/admin/settings" element={<Guard admin><AdminBillingSettings /></Guard>} /><Route path="/admin/services" element={<Guard admin><AdminServices /></Guard>} /><Route path="/admin/products" element={<Navigate to="/admin/services" replace />} /><Route path="/admin/orders" element={<Guard admin><AdminOrders /></Guard>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense></>; }
export default function App() { return <BrowserRouter><BookingProvider><AppRoutes /></BookingProvider></BrowserRouter>; }
