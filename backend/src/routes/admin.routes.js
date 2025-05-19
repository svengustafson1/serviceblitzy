const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

// Import controllers
// Note: The admin.controller.js file is listed as 'CREATED' in the destination repository
// but might not be fully implemented yet. The routes here will connect to the methods
// that should be implemented in that controller.
const adminController = require('../controllers/admin.controller');

/**
 * User Management Routes
 * These routes handle administrative operations for user management
 */

// Get all users with optional filtering
// GET /api/admin/users?role=homeowner&status=active
router.get('/users', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getAllUsers
);

// Get user by ID
// GET /api/admin/users/:id
router.get('/users/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getUserById
);

// Update user
// PUT /api/admin/users/:id
router.put('/users/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.updateUser
);

// Delete user
// DELETE /api/admin/users/:id
router.delete('/users/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.deleteUser
);

/**
 * Service Category Administration Routes
 * These routes handle administrative operations for service categories
 */

// Get all service categories
// GET /api/admin/service-categories
router.get('/service-categories', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getAllServiceCategories
);

// Get service category by ID
// GET /api/admin/service-categories/:id
router.get('/service-categories/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getServiceCategoryById
);

// Create new service category
// POST /api/admin/service-categories
router.post('/service-categories', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.createServiceCategory
);

// Update service category
// PUT /api/admin/service-categories/:id
router.put('/service-categories/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.updateServiceCategory
);

// Delete service category
// DELETE /api/admin/service-categories/:id
router.delete('/service-categories/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.deleteServiceCategory
);

/**
 * Service Management Routes
 * These routes handle administrative operations for services
 */

// Get all services with optional filtering
// GET /api/admin/services?category=cleaning
router.get('/services', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getAllServices
);

// Get service by ID
// GET /api/admin/services/:id
router.get('/services/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getServiceById
);

// Create new service
// POST /api/admin/services
router.post('/services', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.createService
);

// Update service
// PUT /api/admin/services/:id
router.put('/services/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.updateService
);

// Delete service
// DELETE /api/admin/services/:id
router.delete('/services/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.deleteService
);

/**
 * System Analytics and Reporting Routes
 * These routes provide administrative analytics and reporting capabilities
 */

// Get system dashboard analytics
// GET /api/admin/analytics/dashboard
router.get('/analytics/dashboard', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getDashboardAnalytics
);

// Get user growth analytics
// GET /api/admin/analytics/users?period=monthly&start_date=2023-01-01&end_date=2023-12-31
router.get('/analytics/users', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getUserAnalytics
);

// Get service request analytics
// GET /api/admin/analytics/service-requests?period=weekly&start_date=2023-01-01&end_date=2023-12-31
router.get('/analytics/service-requests', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getServiceRequestAnalytics
);

// Get payment analytics
// GET /api/admin/analytics/payments?period=monthly&start_date=2023-01-01&end_date=2023-12-31
router.get('/analytics/payments', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getPaymentAnalytics
);

// Get provider analytics
// GET /api/admin/analytics/providers?period=monthly&start_date=2023-01-01&end_date=2023-12-31
router.get('/analytics/providers', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getProviderAnalytics
);

/**
 * Reporting Routes
 * These routes generate various administrative reports
 */

// Generate user report
// GET /api/admin/reports/users?format=csv&start_date=2023-01-01&end_date=2023-12-31
router.get('/reports/users', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.generateUserReport
);

// Generate service request report
// GET /api/admin/reports/service-requests?format=csv&start_date=2023-01-01&end_date=2023-12-31
router.get('/reports/service-requests', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.generateServiceRequestReport
);

// Generate payment report
// GET /api/admin/reports/payments?format=csv&start_date=2023-01-01&end_date=2023-12-31
router.get('/reports/payments', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.generatePaymentReport
);

// Generate provider payout report
// GET /api/admin/reports/payouts?format=csv&start_date=2023-01-01&end_date=2023-12-31
router.get('/reports/payouts', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.generatePayoutReport
);

/**
 * Audit Log Routes
 * These routes provide access to administrative audit logs
 */

// Get audit logs with filtering options
// GET /api/admin/audit-logs?admin_id=123&action_type=user_update&start_date=2023-01-01&end_date=2023-12-31
router.get('/audit-logs', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getAuditLogs
);

// Get audit log by ID
// GET /api/admin/audit-logs/:id
router.get('/audit-logs/:id', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getAuditLogById
);

/**
 * System Configuration Routes
 * These routes handle system-wide configuration settings
 */

// Get system configuration
// GET /api/admin/config
router.get('/config', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getSystemConfig
);

// Update system configuration
// PUT /api/admin/config
router.put('/config', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.updateSystemConfig
);

/**
 * Platform Metrics Routes
 * These routes provide real-time platform metrics
 */

// Get real-time platform metrics
// GET /api/admin/metrics/real-time
router.get('/metrics/real-time', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getRealTimeMetrics
);

// Get platform health status
// GET /api/admin/metrics/health
router.get('/metrics/health', 
  authMiddleware, 
  authorizeRoles(['admin']), 
  adminController.getSystemHealth
);

module.exports = router;