/**
 * Job Recommendation Routes
 *
 * Routes for job recommendation system:
 * - Job recommendations for seekers
 * - Candidate recommendations for recruiters
 * - Recommendation explanations
 * - Feedback tracking
 */
import { Router } from 'express';
import { jobRecommendationService } from '../../services/job/jobRecommendation';
const router = Router();
// ---------------------------------------------------------------------------
// POST /recommendations/jobs - Recommend jobs for a seeker
// ---------------------------------------------------------------------------
router.post('/recommendations/jobs', async (req, res) => {
    try {
        const { seekerProfile, page, pageSize } = req.body;
        if (!seekerProfile || !seekerProfile.userId || !Array.isArray(seekerProfile.skills)) {
            return res.status(400).json({
                error: 'Invalid request: seekerProfile with userId and skills is required',
            });
        }
        // In a real implementation, jobs would be fetched from the job posting service.
        // For now, expect them in the request body or return an error.
        const { jobs } = req.body;
        if (!jobs || !Array.isArray(jobs)) {
            return res.status(400).json({
                error: 'Invalid request: jobs array is required',
            });
        }
        const result = await jobRecommendationService.recommendJobsForSeeker(seekerProfile, jobs, page, pageSize);
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
// ---------------------------------------------------------------------------
// POST /recommendations/candidates - Recommend candidates for a job
// ---------------------------------------------------------------------------
router.post('/recommendations/candidates', async (req, res) => {
    try {
        const { jobCriteria, candidates, page, pageSize } = req.body;
        if (!jobCriteria || !jobCriteria.jobId) {
            return res.status(400).json({
                error: 'Invalid request: jobCriteria with jobId is required',
            });
        }
        if (!candidates || !Array.isArray(candidates)) {
            return res.status(400).json({
                error: 'Invalid request: candidates array is required',
            });
        }
        const result = await jobRecommendationService.recommendCandidatesForJob(jobCriteria, candidates, page, pageSize);
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
// ---------------------------------------------------------------------------
// GET /recommendations/:id/explain - Explain a recommendation
// ---------------------------------------------------------------------------
router.get('/recommendations/:id/explain', async (req, res) => {
    try {
        const { id } = req.params;
        // Build a minimal recommendation object from query params
        const { score, reasons, matchedSkills, gaps } = req.query;
        if (!score) {
            return res.status(400).json({
                error: 'Invalid request: score query parameter is required',
            });
        }
        const recommendation = {
            itemId: id,
            score: parseInt(score, 10) || 0,
            reasons: reasons ? reasons.split(',').map(r => r.trim()) : [],
            skillMatch: {
                matched: matchedSkills ? matchedSkills.split(',').map(s => s.trim()) : [],
                gaps: gaps ? gaps.split(',').map(g => g.trim()) : [],
            },
        };
        const result = await jobRecommendationService.explainRecommendation(recommendation);
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
// ---------------------------------------------------------------------------
// POST /recommendations/feedback - Record feedback
// ---------------------------------------------------------------------------
router.post('/recommendations/feedback', async (req, res) => {
    try {
        const { userId, recommendationId, itemId, action } = req.body;
        if (!userId || !recommendationId || !itemId || !action) {
            return res.status(400).json({
                error: 'Invalid request: userId, recommendationId, itemId, and action are required',
            });
        }
        if (!['like', 'dislike', 'ignore'].includes(action)) {
            return res.status(400).json({
                error: 'Invalid action: must be one of like, dislike, ignore',
            });
        }
        await jobRecommendationService.recordFeedback({
            userId,
            recommendationId,
            itemId,
            action,
            timestamp: new Date(),
        });
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
// ---------------------------------------------------------------------------
// GET /recommendations/history/:userId - Get feedback history
// ---------------------------------------------------------------------------
router.get('/recommendations/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await jobRecommendationService.getRecommendationHistory(userId);
        return res.json({ userId, feedback: history });
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
// ---------------------------------------------------------------------------
// POST /recommendations/refresh - Refresh/dedup
// ---------------------------------------------------------------------------
router.post('/recommendations/refresh', async (req, res) => {
    try {
        const { userId, seenItemIds } = req.body;
        if (!userId || !Array.isArray(seenItemIds)) {
            return res.status(400).json({
                error: 'Invalid request: userId and seenItemIds array are required',
            });
        }
        await jobRecommendationService.refreshRecommendations(userId, seenItemIds);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
export default router;
//# sourceMappingURL=recommendationRoutes.js.map