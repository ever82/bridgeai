/**
 * Agent API Documentation
 * OpenAPI 3.0 schema definitions for AI agent management
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateAgentRequest:
 *       type: object
 *       required:
 *         - type
 *         - name
 *       properties:
 *         type:
 *           type: string
 *           enum: [DATING, JOB, AD, VISION_SHARE]
 *           description: Agent type/scene
 *         name:
 *           type: string
 *           description: Agent name
 *         description:
 *           type: string
 *           description: Agent description
 *         config:
 *           type: object
 *           description: Agent configuration (model, temperature, system prompt)
 *         latitude:
 *           type: number
 *           description: Location latitude
 *         longitude:
 *           type: number
 *           description: Location longitude
 *     UpdateAgentRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         config:
 *           type: object
 *         latitude:
 *           type: number
 *         longitude:
 *           type: number
 *     UpdateAgentStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED]
 *     FilterAgentsRequest:
 *       type: object
 *       description: FilterDSL query object for advanced agent filtering
 *     AgentSortOptions:
 *       type: string
 *       enum: [relevance, rating, price, experience, activity, credit, composite]
 *     AgentSearchParams:
 *       type: object
 *       properties:
 *         skills:
 *           type: string
 *           description: Comma-separated skills
 *         minRating:
 *           type: number
 *         maxHourlyRate:
 *           type: number
 *         availability:
 *           type: boolean
 *         location:
 *           type: string
 *         language:
 *           type: string
 *           description: Comma-separated languages
 *         experienceYears:
 *           type: integer
 *         verified:
 *           type: boolean
 */