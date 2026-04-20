/**
 * Matching API Documentation
 * OpenAPI 3.0 schema definitions for matching/recommendations
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Match:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         targetId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [pending, liked, passed, mutual, expired]
 *         score:
 *           type: number
 *           description: Match compatibility score (0-100)
 *         createdAt:
 *           type: string
 *           format: date-time
 *     MatchListQuery:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           default: 1
 *         limit:
 *           type: integer
 *           default: 20
 *         status:
 *           type: string
 *           enum: [pending, liked, passed, mutual, expired]
 *         minScore:
 *           type: number
 *           description: Minimum compatibility score
 *     MatchAction:
 *       type: object
 *       required:
 *         - action
 *       properties:
 *         action:
 *           type: string
 *           enum: [like, pass]
 *         message:
 *           type: string
 *           description: Optional message when liking
 */