/**
 * Resume Delivery Service
 *
 * Handles resume delivery to jobs, status tracking, history,
 * and batch delivery management.
 */
import { v4 as uuidv4 } from 'uuid';
import { DeliveryStatus, DeliveryAction, } from '@bridgeai/shared';
import { AppError } from '../../errors';
import { getJobPosting } from '../job/jobPostingService';
import { getProfile } from './profileService';
// maskProfileData will be used for disclosure masking (NP-765 fix pending)
// In-memory stores (replace with Prisma)
const deliveries = new Map();
const deliveryHistory = new Map();
const disclosureRecords = new Map();
// Batch delivery limits
const MAX_BATCH_SIZE = 10;
const _BATCH_COOLDOWN_HOURS = 24;
/**
 * Check if a delivery already exists (prevent duplicate)
 */
export async function checkDuplicateDelivery(resumeId, jobId, seekerId) {
    for (const delivery of deliveries.values()) {
        if (delivery.resumeId === resumeId &&
            delivery.jobId === jobId &&
            delivery.seekerId === seekerId &&
            delivery.status !== DeliveryStatus.WITHDRAWN) {
            return delivery;
        }
    }
    return null;
}
/**
 * Create a new resume delivery
 */
export async function createDelivery(resumeId, jobId, seekerId, seekerAgentId, coverLetter, customAnswers, referralCode) {
    // Check for duplicates
    const existing = await checkDuplicateDelivery(resumeId, jobId, seekerId);
    if (existing) {
        throw new AppError('Already applied to this job', 'DUPLICATE_APPLICATION', 400);
    }
    // Verify job exists and is accepting applications
    const job = await getJobPosting(jobId);
    if (job.status !== 'PUBLISHED') {
        throw new AppError('Job is not accepting applications', 'JOB_NOT_ACCEPTING', 400);
    }
    const now = new Date().toISOString();
    const id = uuidv4();
    const delivery = {
        id,
        resumeId,
        jobId,
        seekerId,
        seekerAgentId,
        employerId: job.employerId,
        employerAgentId: job.agentId,
        coverLetter,
        customAnswers,
        referralCode,
        status: DeliveryStatus.PENDING,
        createdAt: now,
        updatedAt: now,
    };
    deliveries.set(id, delivery);
    // Create history entry
    addHistoryEntry(delivery, DeliveryAction.DELIVERED, seekerId, 'SEEKER', now);
    // Record disclosure for all deliveries (visibility controls what's visible, not tracking)
    // Note: In current model, profile === resume (profileId == resumeId).
    // TODO: When Resume entity is separated, fetch the associated profile via resume.profileId
    const profile = await getProfile(resumeId);
    recordDisclosures(id, profile);
    return delivery;
}
/**
 * Create disclosure records when a profile is delivered
 */
function recordDisclosures(deliveryId, profile) {
    const fields = [];
    if (profile.contactInfo?.phone)
        fields.push({ field: 'phone', value: profile.contactInfo.phone });
    if (profile.contactInfo?.email)
        fields.push({ field: 'email', value: profile.contactInfo.email });
    if (profile.contactInfo?.wechat)
        fields.push({ field: 'wechat', value: profile.contactInfo.wechat });
    disclosureRecords.set(deliveryId, fields);
}
/**
 * Add history entry
 */
function addHistoryEntry(delivery, action, actorId, actorType, timestamp, metadata) {
    const entry = {
        id: uuidv4(),
        deliveryId: delivery.id,
        action,
        toStatus: mapActionToStatus(action),
        actorId,
        actorType,
        createdAt: timestamp,
        metadata,
    };
    const history = deliveryHistory.get(delivery.id) || [];
    history.push(entry);
    deliveryHistory.set(delivery.id, history);
}
/**
 * Map action to resulting status
 */
function mapActionToStatus(action) {
    const mapping = {
        [DeliveryAction.DELIVERED]: DeliveryStatus.PENDING,
        [DeliveryAction.VIEWED]: DeliveryStatus.VIEWED,
        [DeliveryAction.SHORTLISTED]: DeliveryStatus.SHORTLISTED,
        [DeliveryAction.REJECTED]: DeliveryStatus.REJECTED,
        [DeliveryAction.INTERVIEW_INVITED]: DeliveryStatus.INTERVIEWING,
        [DeliveryAction.OFFER_EXTENDED]: DeliveryStatus.OFFERED,
        [DeliveryAction.OFFER_ACCEPTED]: DeliveryStatus.OFFERED,
        [DeliveryAction.OFFER_DECLINED]: DeliveryStatus.REJECTED,
        [DeliveryAction.HIRED]: DeliveryStatus.HIRED,
        [DeliveryAction.WITHDRAWN]: DeliveryStatus.WITHDRAWN,
        [DeliveryAction.EXPIRED]: DeliveryStatus.EXPIRED,
        [DeliveryAction.STATUS_UPDATED]: DeliveryStatus.PENDING,
        [DeliveryAction.NOTE_ADDED]: DeliveryStatus.PENDING,
    };
    return mapping[action] || DeliveryStatus.PENDING;
}
/**
 * Get delivery by ID
 */
export async function getDelivery(deliveryId) {
    const delivery = deliveries.get(deliveryId);
    if (!delivery) {
        throw new AppError('Delivery not found', 'DELIVERY_NOT_FOUND', 404);
    }
    return delivery;
}
/**
 * Get delivery for seeker (with masked data based on visibility)
 */
export async function getDeliveryForSeeker(deliveryId, seekerId) {
    const delivery = await getDelivery(deliveryId);
    if (delivery.seekerId !== seekerId) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    }
    return delivery;
}
/**
 * Get delivery for employer (with disclosure data)
 */
export async function getDeliveryForEmployer(deliveryId, employerId) {
    const delivery = await getDelivery(deliveryId);
    if (delivery.employerId !== employerId) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    }
    // Get disclosed fields
    const disclosures = disclosureRecords.get(deliveryId) || [];
    return { ...delivery, disclosures };
}
/**
 * Update delivery status
 */
export async function updateDeliveryStatus(deliveryId, actorId, actorType, newStatus, reason) {
    const delivery = deliveries.get(deliveryId);
    if (!delivery) {
        throw new AppError('Delivery not found', 'DELIVERY_NOT_FOUND', 404);
    }
    const now = new Date().toISOString();
    const oldStatus = delivery.status;
    // Validate state transitions
    const validTransitions = {
        [DeliveryStatus.PENDING]: [
            DeliveryStatus.VIEWED,
            DeliveryStatus.SHORTLISTED,
            DeliveryStatus.REJECTED,
            DeliveryStatus.INTERVIEWING,
            DeliveryStatus.WITHDRAWN,
        ],
        [DeliveryStatus.VIEWED]: [
            DeliveryStatus.SHORTLISTED,
            DeliveryStatus.REJECTED,
            DeliveryStatus.INTERVIEWING,
            DeliveryStatus.WITHDRAWN,
        ],
        [DeliveryStatus.SHORTLISTED]: [
            DeliveryStatus.INTERVIEWING,
            DeliveryStatus.REJECTED,
            DeliveryStatus.WITHDRAWN,
        ],
        [DeliveryStatus.INTERVIEWING]: [
            DeliveryStatus.OFFERED,
            DeliveryStatus.REJECTED,
            DeliveryStatus.WITHDRAWN,
        ],
        [DeliveryStatus.OFFERED]: [DeliveryStatus.HIRED, DeliveryStatus.REJECTED],
        [DeliveryStatus.REJECTED]: [],
        [DeliveryStatus.HIRED]: [],
        [DeliveryStatus.WITHDRAWN]: [],
        [DeliveryStatus.EXPIRED]: [],
    };
    if (!validTransitions[oldStatus]?.includes(newStatus)) {
        throw new AppError(`Invalid status transition from ${oldStatus} to ${newStatus}`, 'INVALID_STATUS_TRANSITION', 400);
    }
    delivery.status = newStatus;
    delivery.updatedAt = now;
    if (newStatus === DeliveryStatus.VIEWED) {
        delivery.viewedAt = now;
    }
    if ([DeliveryStatus.REJECTED, DeliveryStatus.HIRED].includes(newStatus)) {
        delivery.respondedAt = now;
    }
    deliveries.set(deliveryId, delivery);
    // Add history
    const action = mapStatusToAction(newStatus);
    addHistoryEntry(delivery, action, actorId, actorType, now, { reason });
    return delivery;
}
/**
 * Map status back to action for history
 */
function mapStatusToAction(status) {
    const mapping = {
        [DeliveryStatus.VIEWED]: DeliveryAction.VIEWED,
        [DeliveryStatus.SHORTLISTED]: DeliveryAction.SHORTLISTED,
        [DeliveryStatus.REJECTED]: DeliveryAction.REJECTED,
        [DeliveryStatus.INTERVIEWING]: DeliveryAction.INTERVIEW_INVITED,
        [DeliveryStatus.OFFERED]: DeliveryAction.OFFER_EXTENDED,
        [DeliveryStatus.HIRED]: DeliveryAction.HIRED,
        [DeliveryStatus.WITHDRAWN]: DeliveryAction.WITHDRAWN,
        [DeliveryStatus.EXPIRED]: DeliveryAction.EXPIRED,
        [DeliveryStatus.PENDING]: DeliveryAction.STATUS_UPDATED,
    };
    return mapping[status] || DeliveryAction.STATUS_UPDATED;
}
/**
 * Withdraw a delivery
 */
export async function withdrawDelivery(deliveryId, seekerId, reason) {
    const delivery = await getDelivery(deliveryId);
    if (delivery.seekerId !== seekerId) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    }
    if (delivery.status === DeliveryStatus.HIRED) {
        throw new AppError('Cannot withdraw after being hired', 'CANNOT_WITHDRAW', 400);
    }
    if (delivery.status === DeliveryStatus.WITHDRAWN) {
        throw new AppError('Already withdrawn', 'ALREADY_WITHDRAWN', 400);
    }
    const now = new Date().toISOString();
    delivery.status = DeliveryStatus.WITHDRAWN;
    delivery.withdrawnAt = now;
    delivery.updatedAt = now;
    deliveries.set(deliveryId, delivery);
    addHistoryEntry(delivery, DeliveryAction.WITHDRAWN, seekerId, 'SEEKER', now, { reason });
    return delivery;
}
/**
 * List deliveries for a seeker
 */
export async function listDeliveriesForSeeker(seekerId, filter = {}) {
    let results = Array.from(deliveries.values()).filter(d => d.seekerId === seekerId);
    if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        results = results.filter(d => statuses.includes(d.status));
    }
    if (filter.jobId) {
        results = results.filter(d => d.jobId === filter.jobId);
    }
    // Sort
    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';
    results.sort((a, b) => {
        const valA = sortBy === 'createdAt' ? new Date(a.createdAt) : new Date(a.updatedAt);
        const valB = sortBy === 'createdAt' ? new Date(b.createdAt) : new Date(b.updatedAt);
        return sortOrder === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
    });
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    return {
        deliveries: results.slice((page - 1) * limit, page * limit),
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
/**
 * List deliveries for an employer (received applications)
 */
export async function listDeliveriesForEmployer(employerId, filter = {}) {
    let results = Array.from(deliveries.values()).filter(d => d.employerId === employerId);
    if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        results = results.filter(d => statuses.includes(d.status));
    }
    if (filter.jobId) {
        results = results.filter(d => d.jobId === filter.jobId);
    }
    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';
    results.sort((a, b) => {
        const valA = sortBy === 'createdAt' ? new Date(a.createdAt) : new Date(a.updatedAt);
        const valB = sortBy === 'createdAt' ? new Date(b.createdAt) : new Date(b.updatedAt);
        return sortOrder === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
    });
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    return {
        deliveries: results.slice((page - 1) * limit, page * limit),
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
/**
 * Get delivery history
 */
export async function getDeliveryHistory(deliveryId) {
    void getDelivery(deliveryId); // validate delivery exists
    return deliveryHistory.get(deliveryId) || [];
}
/**
 * Get delivery statistics for a seeker
 */
export async function getSeekerDeliveryStats(seekerId) {
    const results = Array.from(deliveries.values()).filter(d => d.seekerId === seekerId);
    return calculateStats(results);
}
/**
 * Get delivery statistics for an employer
 */
export async function getEmployerDeliveryStats(employerId) {
    const results = Array.from(deliveries.values()).filter(d => d.employerId === employerId);
    return calculateStats(results);
}
function calculateStats(deliveries) {
    const total = deliveries.length;
    const counts = {
        pending: 0,
        viewed: 0,
        shortlisted: 0,
        rejected: 0,
        interviewing: 0,
        offered: 0,
        hired: 0,
        withdrawn: 0,
    };
    for (const d of deliveries) {
        switch (d.status) {
            case DeliveryStatus.PENDING:
                counts.pending++;
                break;
            case DeliveryStatus.VIEWED:
                counts.viewed++;
                break;
            case DeliveryStatus.SHORTLISTED:
                counts.shortlisted++;
                break;
            case DeliveryStatus.REJECTED:
                counts.rejected++;
                break;
            case DeliveryStatus.INTERVIEWING:
                counts.interviewing++;
                break;
            case DeliveryStatus.OFFERED:
                counts.offered++;
                break;
            case DeliveryStatus.HIRED:
                counts.hired++;
                break;
            case DeliveryStatus.WITHDRAWN:
                counts.withdrawn++;
                break;
        }
    }
    const responseRate = total > 0 ? ((counts.viewed + counts.rejected + counts.shortlisted) / total) * 100 : 0;
    const successRate = total > 0 ? ((counts.hired + counts.offered) / total) * 100 : 0;
    return {
        totalDeliveries: total,
        pendingCount: counts.pending,
        viewedCount: counts.viewed,
        shortlistedCount: counts.shortlisted,
        rejectedCount: counts.rejected,
        interviewingCount: counts.interviewing,
        offeredCount: counts.offered,
        hiredCount: counts.hired,
        withdrawnCount: counts.withdrawn,
        responseRate: Math.round(responseRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
    };
}
/**
 * Batch deliver resume to multiple jobs
 */
export async function batchDeliver(resumeId, jobIds, seekerId, seekerAgentId, coverLetter) {
    if (jobIds.length > MAX_BATCH_SIZE) {
        throw new AppError(`Cannot batch deliver to more than ${MAX_BATCH_SIZE} jobs at once`, 'BATCH_TOO_LARGE', 400);
    }
    const results = [];
    for (const jobId of jobIds) {
        try {
            const delivery = await createDelivery(resumeId, jobId, seekerId, seekerAgentId, coverLetter);
            results.push({
                jobId,
                success: true,
                deliveryId: delivery.id,
            });
        }
        catch (error) {
            results.push({
                jobId,
                success: false,
                error: error?.message || 'Unknown error',
            });
        }
    }
    return results;
}
/**
 * Notify seeker of disclosure change
 */
export async function notifyDisclosureChange(deliveryId, seekerId, changedFields) {
    try {
        const { notificationService } = await import('../notificationService');
        await notificationService.sendToUser(seekerId, {
            type: 'DISCLOSURE_CHANGE',
            title: '隐私信息变更通知',
            content: `您的简历联系方式可见性已变更，涉及字段：${changedFields.join('、')}`,
            data: { deliveryId, changedFields },
            category: 'job_seeker',
        });
    }
    catch (err) {
        // Fallback to log if notification service is unavailable
        console.warn(`Failed to send disclosure notification to ${seekerId}:`, err);
    }
}
/**
 * Revoke disclosure for a specific field
 */
export async function revokeDisclosure(deliveryId, seekerId, field) {
    const delivery = await getDelivery(deliveryId);
    if (delivery.seekerId !== seekerId) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    }
    const records = disclosureRecords.get(deliveryId) || [];
    const record = records.find(r => r.field === field);
    if (record) {
        record.value = '[REVOKED]';
        disclosureRecords.set(deliveryId, records);
        addHistoryEntry(delivery, DeliveryAction.STATUS_UPDATED, seekerId, 'SEEKER', new Date().toISOString(), {
            type: 'DISCLOSURE_REVOKED',
            field,
        });
    }
}
//# sourceMappingURL=deliveryService.js.map