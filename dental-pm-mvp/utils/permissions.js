const NONE = [];

const CLINIC_FULL_ACCESS = {
  subscriptions: ['read', 'execute'],
  cabinet_settings: ['read', 'write', 'execute'],
  cabinet_users: ['read', 'write', 'execute'],
  patients: ['read', 'write', 'execute'],
  appointments: ['read', 'write', 'execute'],
  dental_chart: ['read', 'write', 'execute'],
  prescriptions: ['read', 'write', 'execute'],
  patient_documents: ['read', 'write', 'execute'],
  pricing_syndical: ['read'],
  pricing_cabinet: ['read', 'write', 'execute'],
  quotes: ['read', 'write', 'execute'],
  invoices: ['read', 'write', 'execute'],
  payments: ['read', 'write', 'execute'],
  reports: ['read', 'write', 'execute'],
  inventory: ['read', 'write', 'execute'],
  suppliers: ['read', 'write', 'execute'],
  purchases: ['read', 'write', 'execute'],
  lab_orders: ['read', 'write', 'execute'],
  messaging: ['read', 'write', 'execute'],
  legal: ['read'],
  audit_logs: ['read'],
};

const ASSISTANT_ACCESS = {
  ...CLINIC_FULL_ACCESS,
  pricing_cabinet: ['read', 'write'],
  lab_orders: ['read', 'write'],
};

const ACCOUNTANT_ACCESS = {
  ...CLINIC_FULL_ACCESS,
  patients: ['read'],
  appointments: ['read'],
  dental_chart: ['read'],
  prescriptions: ['read'],
  patient_documents: ['read'],
  lab_orders: ['read'],
  inventory: ['read'],
  suppliers: ['read'],
  purchases: ['read', 'write', 'execute'],
  invoices: ['read', 'write', 'execute'],
  payments: ['read', 'write', 'execute'],
  reports: ['read', 'write', 'execute'],
  messaging: ['read'],
};

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    platform_clinics: ['read', 'write', 'execute'],
    subscriptions: ['read', 'write', 'execute'],
    pricing_syndical: ['read'],
    legal: ['read'],
    audit_logs: ['read'],
  },
  ADMIN: CLINIC_FULL_ACCESS,
  DENTIST: CLINIC_FULL_ACCESS,
  ASSISTANT: ASSISTANT_ACCESS,
  ACCOUNTANT: ACCOUNTANT_ACCESS,
};

function getPermissionsForRole(role, moduleName) {
  return ROLE_PERMISSIONS[role]?.[moduleName] || NONE;
}

function hasPermission(role, moduleName, verb) {
  return getPermissionsForRole(role, moduleName).includes(verb);
}

function requirePermission(moduleName, verb) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (hasPermission(role, moduleName, verb)) return next();

    return res.status(403).json({
      error: 'Permissions insuffisantes',
      code: 'INSUFFICIENT_PERMISSIONS',
      required_permission: `${moduleName}:${verb}`,
      user_role: role || null
    });
  };
}

function getVerbForRequest(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return 'read';
  return 'write';
}

function requireModuleAccess(moduleName) {
  return (req, res, next) => {
    const verb = getVerbForRequest(req);
    const role = req.user?.role;
    if (hasPermission(role, moduleName, verb)) return next();

    return res.status(403).json({
      error: 'Permissions insuffisantes',
      code: 'INSUFFICIENT_PERMISSIONS',
      required_permission: `${moduleName}:${verb}`,
      user_role: role || null
    });
  };
}

module.exports = {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  hasPermission,
  requirePermission,
  requireModuleAccess,
  getVerbForRequest,
};
