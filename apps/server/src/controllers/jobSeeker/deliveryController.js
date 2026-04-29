/**
 * Resume Delivery Controller
 *
 * HTTP handlers for resume delivery management
 */
import { createDelivery, getDelivery, getDeliveryForSeeker, getDeliveryForEmployer, updateDeliveryStatus, withdrawDelivery, listDeliveriesForSeeker, listDeliveriesForEmployer, getDeliveryHistory, getSeekerDeliveryStats, getEmployerDeliveryStats, batchDeliver, revokeDisclosure, } from '../../services/jobSeeker/deliveryService';
import { AppError } from '../../errors';
/**
 * Create a new delivery
 */
export async function deliver(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { resumeId, jobId, coverLetter, customAnswers, referralCode } = req.body;
        const delivery = await createDelivery(resumeId, jobId, req.user.id, req.user.agentId || req.user.id, coverLetter, customAnswers, referralCode);
        res.status(201).json({ success: true, data: delivery });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Batch deliver to multiple jobs
 */
export async function batchDeliverResume(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { resumeId, jobIds, coverLetter } = req.body;
        const results = await batchDeliver(resumeId, jobIds, req.user.id, req.user.agentId || req.user.id, coverLetter);
        const successful = results.filter(r => r.success).length;
        res.json({
            success: true,
            data: {
                total: results.length,
                successful,
                failed: results.length - successful,
                results,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get my deliveries (seeker view)
 */
export async function getMyDeliveries(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const status = req.query.status;
        const jobId = req.query.jobId;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const result = await listDeliveriesForSeeker(req.user.id, {
            status,
            jobId,
            page,
            limit,
        });
        res.json({
            success: true,
            data: result.deliveries,
            pagination: result.pagination,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get my delivery stats
 */
export async function getMyDeliveryStats(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const stats = await getSeekerDeliveryStats(req.user.id);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get received deliveries (employer view)
 */
export async function getReceivedDeliveries(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const status = req.query.status;
        const jobId = req.query.jobId;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const result = await listDeliveriesForEmployer(req.user.id, {
            status,
            jobId,
            page,
            limit,
        });
        res.json({
            success: true,
            data: result.deliveries,
            pagination: result.pagination,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get received delivery stats (employer)
 */
export async function getReceivedDeliveryStats(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const stats = await getEmployerDeliveryStats(req.user.id);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get single delivery (seeker)
 */
export async function getMyDelivery(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const delivery = await getDeliveryForSeeker(id, req.user.id);
        res.json({ success: true, data: delivery });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get single delivery with disclosures (employer)
 */
export async function getReceivedDelivery(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const delivery = await getDeliveryForEmployer(id, req.user.id);
        res.json({ success: true, data: delivery });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Update delivery status (employer action)
 */
export async function updateStatus(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const { status, reason } = req.body;
        const delivery = await updateDeliveryStatus(id, req.user.id, 'EMPLOYER', status, reason);
        res.json({ success: true, data: delivery });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Withdraw a delivery (seeker action)
 */
export async function withdraw(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const { reason } = req.body || {};
        const delivery = await withdrawDelivery(id, req.user.id, reason);
        res.json({ success: true, data: delivery });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get delivery history
 */
export async function getHistory(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id } = req.params;
        const delivery = await getDelivery(id);
        // Verify user is either seeker or employer
        if (delivery.seekerId !== req.user.id && delivery.employerId !== req.user.id) {
            throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
        }
        const history = await getDeliveryHistory(id);
        res.json({ success: true, data: history });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Revoke a disclosure (seeker action)
 */
export async function revokeField(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }
        const { id, field } = req.params;
        await revokeDisclosure(id, req.user.id, field);
        res.json({ success: true, message: 'Disclosure revoked' });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=deliveryController.js.map