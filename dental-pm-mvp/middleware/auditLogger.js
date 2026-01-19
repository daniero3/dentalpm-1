/**
 * Audit Logger Middleware
 * Log CREATE/UPDATE/DELETE sur patients, appointments, invoices
 */

const { AuditLog } = require('../models');

const AUDITED_RESOURCES = ['patients', 'appointments', 'invoices'];

const auditLogger = (resourceType) => {
  return async (req, res, next) => {
    // Only audit write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      try {
        // Only log successful operations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const action = req.method === 'POST' ? 'CREATE' 
            : req.method === 'DELETE' ? 'DELETE' 
            : 'UPDATE';

          const resourceId = req.params.id 
            || data?.appointment?.id 
            || data?.patient?.id 
            || data?.invoice?.id
            || data?.id
            || null;

          await AuditLog.create({
            user_id: req.user?.id || null,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            old_values: null, // Simplified - not tracking old values
            new_values: req.method !== 'DELETE' ? req.body : null,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.get('User-Agent'),
            description: `${action} ${resourceType} ${resourceId || ''}`
          });
        }
      } catch (error) {
        console.error('Audit log error:', error.message);
        // Don't fail the request if audit fails
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = { auditLogger };
