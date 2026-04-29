/**
 * Sensitive Word Management Routes
 * 敏感词管理路由
 *
 * GET    /api/v1/sensitive-words         - List sensitive words (admin only)
 * POST   /api/v1/sensitive-words         - Add new word (admin only)
 * PUT    /api/v1/sensitive-words/:id     - Update word (admin only)
 * DELETE /api/v1/sensitive-words/:id     - Deactivate word (admin only)
 * POST   /api/v1/sensitive-words/reload  - Force reload word library (admin only)
 * POST   /api/v1/sensitive-words/check   - Check a text string (admin only, for testing)
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import * as sensitiveWordFilter from '../services/sensitiveWordFilter';
const router = Router();
/**
 * Admin authentication middleware
 */
function requireAdmin(req, _res, next) {
    if (!req.user) {
        throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        throw new AppError('Admin access required', 'FORBIDDEN', 403);
    }
    next();
}
// All routes require admin authentication
router.use(authenticate, requireAdmin);
/**
 * @route GET /api/v1/sensitive-words
 * @desc List sensitive words with filters and pagination
 * @access Admin only
 */
router.get('/', asyncHandler(async (req, res) => {
    const category = req.query.category;
    const level = req.query.level;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const search = req.query.search;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await sensitiveWordFilter.listWords({
        category,
        level,
        isActive,
        search,
        page,
        limit,
    });
    res.json(ApiResponse.paginated(result.words, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
    }));
}));
/**
 * @route POST /api/v1/sensitive-words
 * @desc Add a new sensitive word
 * @access Admin only
 */
router.post('/', asyncHandler(async (req, res) => {
    const { word, category, level, replacement, regex } = req.body;
    if (!word || typeof word !== 'string' || word.trim().length === 0) {
        throw new AppError('Word is required', 'INVALID_REQUEST', 400);
    }
    if (level && !['WARNING', 'REPLACE', 'BLOCK'].includes(level)) {
        throw new AppError('Invalid level. Must be WARNING, REPLACE, or BLOCK', 'INVALID_REQUEST', 400);
    }
    const record = await sensitiveWordFilter.addWord({
        word: word.trim(),
        category,
        level,
        replacement,
        regex,
        createdBy: req.user.id,
    });
    res.status(201).json(ApiResponse.success(record, 'Sensitive word added'));
}));
/**
 * @route POST /api/v1/sensitive-words/reload
 * @desc Force reload word library from database
 * @access Admin only
 */
router.post('/reload', asyncHandler(async (_req, res) => {
    const count = await sensitiveWordFilter.reloadLibrary();
    res.json(ApiResponse.success({ loadedCount: count }, 'Word library reloaded'));
}));
/**
 * @route POST /api/v1/sensitive-words/check
 * @desc Check a text string against the word library (for testing)
 * @access Admin only
 */
router.post('/check', asyncHandler(async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        throw new AppError('Text is required', 'INVALID_REQUEST', 400);
    }
    const result = await sensitiveWordFilter.filterText(text);
    res.json(ApiResponse.success({
        blocked: result.blocked,
        filteredText: result.filteredText,
        matchCount: result.matches.length,
        matches: result.matches.map((m) => ({
            word: m.word,
            category: m.category,
            level: m.level,
            matchedText: m.matchedText,
            position: [m.matchStart, m.matchEnd],
        })),
        warningCount: result.warnings.length,
    }));
}));
/**
 * @route PUT /api/v1/sensitive-words/:id
 * @desc Update a sensitive word
 * @access Admin only
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { word, category, level, isActive, replacement, regex } = req.body;
    if (level && !['WARNING', 'REPLACE', 'BLOCK'].includes(level)) {
        throw new AppError('Invalid level. Must be WARNING, REPLACE, or BLOCK', 'INVALID_REQUEST', 400);
    }
    const record = await sensitiveWordFilter.updateWord(id, {
        word,
        category,
        level,
        isActive,
        replacement,
        regex,
    });
    res.json(ApiResponse.success(record, 'Sensitive word updated'));
}));
/**
 * @route DELETE /api/v1/sensitive-words/:id
 * @desc Deactivate a sensitive word (soft delete)
 * @access Admin only
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const record = await sensitiveWordFilter.removeWord(id);
    res.json(ApiResponse.success(record, 'Sensitive word deactivated'));
}));
export default router;
//# sourceMappingURL=sensitiveWords.js.map