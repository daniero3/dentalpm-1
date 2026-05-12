const { hasPermission, getPermissionsForRole, getVerbForRequest } = require('../utils/permissions');

describe('RBAC permission matrix', () => {
  test('SUPER_ADMIN cannot access medical patient data', () => {
    expect(hasPermission('SUPER_ADMIN', 'patients', 'read')).toBe(false);
    expect(hasPermission('SUPER_ADMIN', 'invoices', 'read')).toBe(false);
    expect(hasPermission('SUPER_ADMIN', 'prescriptions', 'read')).toBe(false);
  });

  test('ADMIN can manage cabinet pricing and invoices', () => {
    expect(hasPermission('ADMIN', 'pricing_cabinet', 'read')).toBe(true);
    expect(hasPermission('ADMIN', 'pricing_cabinet', 'write')).toBe(true);
    expect(hasPermission('ADMIN', 'pricing_cabinet', 'execute')).toBe(true);
    expect(hasPermission('ADMIN', 'invoices', 'execute')).toBe(true);
  });

  test('ASSISTANT can read cabinet pricing but cannot modify it', () => {
    expect(hasPermission('ASSISTANT', 'pricing_cabinet', 'read')).toBe(true);
    expect(hasPermission('ASSISTANT', 'pricing_cabinet', 'write')).toBe(true);
    expect(hasPermission('ASSISTANT', 'pricing_cabinet', 'execute')).toBe(false);
  });

  test('operational roles can execute payment workflows but accountants still avoid prescriptions', () => {
    expect(hasPermission('ADMIN', 'payments', 'execute')).toBe(true);
    expect(hasPermission('DENTIST', 'payments', 'execute')).toBe(true);
    expect(hasPermission('ASSISTANT', 'payments', 'execute')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'payments', 'execute')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'reports', 'execute')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'prescriptions', 'write')).toBe(false);
  });

  test('unknown roles and modules have no permissions', () => {
    expect(getPermissionsForRole('UNKNOWN', 'patients')).toEqual([]);
    expect(getPermissionsForRole('ADMIN', 'unknown_module')).toEqual([]);
  });

  test('HTTP methods map to read/write verbs', () => {
    expect(getVerbForRequest({ method: 'GET' })).toBe('read');
    expect(getVerbForRequest({ method: 'HEAD' })).toBe('read');
    expect(getVerbForRequest({ method: 'POST' })).toBe('write');
    expect(getVerbForRequest({ method: 'PATCH' })).toBe('write');
    expect(getVerbForRequest({ method: 'DELETE' })).toBe('write');
  });

  test('execute permissions remain stricter than regular write permissions', () => {
    expect(hasPermission('DENTIST', 'invoices', 'write')).toBe(true);
    expect(hasPermission('DENTIST', 'inventory', 'write')).toBe(true);
    expect(hasPermission('DENTIST', 'payments', 'execute')).toBe(true);
    expect(hasPermission('ASSISTANT', 'lab_orders', 'write')).toBe(true);
    expect(hasPermission('ASSISTANT', 'lab_orders', 'execute')).toBe(false);
  });
});
