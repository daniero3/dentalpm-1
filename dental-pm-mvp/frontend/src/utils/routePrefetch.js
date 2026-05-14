const routeLoaders = {
  '/': () => import('../components/Dashboard'),
  '/patients': () => import('../components/PatientManagement'),
  '/appointments': () => import('../components/AppointmentManagement'),
  '/invoices': () => import('../components/InvoiceManagement'),
  '/quotes': () => import('../components/QuoteManagement'),
  '/reports': () => import('../components/ReportsManagement'),
  '/inventory': () => import('../components/InventoryManagement'),
  '/purchases': () => import('../components/PurchaseManagement'),
  '/suppliers': () => import('../components/SupplierManagement'),
  '/lab': () => import('../components/LabManagement'),
  '/mailing': () => import('../components/DentalMailingSuite'),
  '/settings': () => import('../components/CabinetSettings'),
  '/settings/pricing': () => import('../components/PricingSettings'),
  '/settings/billing': () => import('../components/BillingSettings'),
  '/subscription': () => import('../components/SubscriptionManagement'),
  '/admin/clinics': () => import('../components/SuperAdminClinics'),
  '/admin/payments': () => import('../components/PaymentValidationPage'),
  '/admin/partners': () => import('../components/AdminPartners'),
};

const prefetched = new Set();

export const prefetchRoute = (href) => {
  const loader = routeLoaders[href];
  if (!loader || prefetched.has(href)) return;
  prefetched.add(href);
  loader().catch(() => prefetched.delete(href));
};

export const preloadCriticalRoutes = () => {
  const run = () => ['/', '/patients', '/appointments', '/invoices', '/reports'].forEach(prefetchRoute);
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else if (typeof window !== 'undefined') {
    window.setTimeout(run, 1200);
  }
};

export const createHoverPrefetch = (href) => {
  let timer = null;
  return {
    onMouseEnter: () => {
      timer = window.setTimeout(() => prefetchRoute(href), 200);
    },
    onMouseLeave: () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    },
    onFocus: () => prefetchRoute(href),
  };
};
