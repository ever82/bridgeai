/**
 * Resume Delivery Routes
 *
 * Routes for resume delivery to job postings and delivery management
 */
import { Router } from 'express';
import { deliver, batchDeliverResume, getMyDeliveries, getMyDelivery, getMyDeliveryStats, withdraw, getHistory, revokeField, getReceivedDeliveries, getReceivedDelivery, getReceivedDeliveryStats, updateStatus, } from '../../controllers/jobSeeker/deliveryController';
import { authenticate } from '../../middleware/auth';
const router = Router();
// Seeker routes
router.post('/', authenticate, deliver);
router.post('/batch', authenticate, batchDeliverResume);
router.get('/me', authenticate, getMyDeliveries);
router.get('/me/stats', authenticate, getMyDeliveryStats);
router.get('/me/:id', authenticate, getMyDelivery);
router.delete('/me/:id', authenticate, withdraw);
router.get('/me/:id/history', authenticate, getHistory);
router.patch('/me/:id/fields/:field', authenticate, revokeField);
// Employer routes
router.get('/received', authenticate, getReceivedDeliveries);
router.get('/received/stats', authenticate, getReceivedDeliveryStats);
router.get('/received/:id', authenticate, getReceivedDelivery);
router.patch('/received/:id/status', authenticate, updateStatus);
export default router;
//# sourceMappingURL=delivery.routes.js.map