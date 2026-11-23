export const staticAppPaths = [
  '/login', '/register', '/forgot-password', '/cart', '/schedule', '/addresses',
  '/addresses/new', '/payment-method', '/orders', '/account', '/admin',
  '/admin/users', '/admin/customers', '/admin/invoices', '/admin/settings',
  '/admin/services', '/admin/products',
];

export const parameterizedAppPaths = ['/confirmation/:id', '/payment/:id'];

export function isParameterizedAppPath(pathname) {
  const parts = pathname.replace(/\/$/, '').split('/');
  return parts.length === 3 && Boolean(parts[2]) && parameterizedAppPaths.includes(`/${parts[1]}/:id`);
}
