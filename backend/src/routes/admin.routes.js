const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

/**
 * Admin Routes
 * Provides comprehensive administrative capabilities for platform management
 * including user oversight, service configuration, system analytics, and audit logging.
 */

// Middleware to ensure only admins can access these routes
const adminAuth = [authMiddleware, authorizeRoles(['admin'])];

// User Management Routes
router.get('/users', adminAuth, adminController.getAllUsers);
router.get('/users/:id', adminAuth, adminController.getUserById);
router.put('/users/:id', adminAuth, adminController.updateUser);
router.delete('/users/:id', adminAuth, adminController.deleteUser);

// Service Category Management Routes
router.get('/service-categories', adminAuth, adminController.getAllServiceCategories);
router.get('/service-categories/:id', adminAuth, adminController.getServiceCategoryById);
router.post('/service-categories', adminAuth, adminController.createServiceCategory);
router.put('/service-categories/:id', adminAuth, adminController.updateServiceCategory);
router.delete('/service-categories/:id', adminAuth, adminController.deleteServiceCategory);

// Service Management Routes
router.get('/services', adminAuth, adminController.getAllServices);
router.get('/services/:id', adminAuth, adminController.getServiceById);
router.post('/services', adminAuth, adminController.createService);
router.put('/services/:id', adminAuth, adminController.updateService);
router.delete('/services/:id', adminAuth, adminController.deleteService);

// Analytics Routes
router.get('/analytics/dashboard', adminAuth, adminController.getDashboardAnalytics);
router.get('/analytics/users', adminAuth, adminController.getUserAnalytics);
router.get('/analytics/service-requests', adminAuth, adminController.getServiceRequestAnalytics);
router.get('/analytics/payments', adminAuth, adminController.getPaymentAnalytics);
router.get('/analytics/providers', adminAuth, adminController.getProviderAnalytics);

// Report Generation Routes
router.get('/reports/users', adminAuth, adminController.generateUserReport);
router.get('/reports/service-requests', adminAuth, adminController.generateServiceRequestReport);
router.get('/reports/payments', adminAuth, adminController.generatePaymentReport);
router.get('/reports/payouts', adminAuth, adminController.generatePayoutReport);

// Audit Log Routes
router.get('/audit-logs', adminAuth, adminController.getAuditLogs);
router.get('/audit-logs/:id', adminAuth, adminController.getAuditLogById);

// System Configuration Routes
router.get('/config', adminAuth, adminController.getSystemConfig);
router.put('/config', adminAuth, adminController.updateSystemConfig);

// System Metrics Routes
router.get('/metrics/real-time', adminAuth, adminController.getRealTimeMetrics);
router.get('/metrics/health', adminAuth, adminController.getSystemHealth);

module.exports = router;