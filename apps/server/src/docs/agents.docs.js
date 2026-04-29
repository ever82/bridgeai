/**
 * Agent API Documentation
 * OpenAPI 3.0 schema definitions for AI agent management
 *
 * This file documents agent endpoints using JSDoc annotations
 * for swagger-jsdoc to parse.
 *
 * ## Agent Information Model (L1 / L2 / L3)
 *
 * Agents are structured across three levels of profile depth:
 *
 * - **L1 (Structural Profile):** Core identity attributes — id, userId, name,
 *   description, type, status, latitude, longitude. Defines what the agent is
 *   and where it operates. Includes timestamps for lifecycle tracking.
 *
 * - **L2 (Behavioral Profile):** Runtime configuration and scene settings.
 *   The `config` object (scene configuration) contains model selection,
 *   temperature, system prompts, and scene-specific parameters. This drives
 *   how the agent behaves in context.
 *
 * - **L3 (Historical Profile):** Cumulative agent history — interactions,
 *   feedback, performance metrics derived from past sessions. Accessible via
 *   GET /api/v1/agents/{id}/history for authenticated requests.
 *
 * ## Scene Configuration Fields
 *
 * The `config` object in agent requests supports the following fields:
 *
 * - `model` (string): LLM model identifier, e.g. "gpt-4o-mini"
 * - `temperature` (number): Sampling temperature for generation (0.0–2.0)
 * - `systemPrompt` (string): System prompt that defines agent persona and behavior
 * - `maxTokens` (integer): Maximum token limit per response
 * - `topP` (number): Nucleus sampling probability
 * - `sceneType` (string): Scene classification (DATING, JOB, AD, VISION_SHARE)
 * - `sceneMetadata` (object): Scene-specific key-value metadata
 * - `tools` (array): List of enabled tool names or tool definitions
 * - `retrievalConfig` (object): Retrieval-augmented generation configuration
 * - `contextWindow` (integer): Number of recent messages retained in context
 */
/**
 * @openapi
 * components:
 *   schemas:
 *     Agent:
 *       type: object
 *       description: L1 structural profile — core agent identity and lifecycle
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique agent identifier
 *         userId:
 *           type: string
 *           format: uuid
 *           description: Owner user identifier
 *         name:
 *           type: string
 *           description: Agent display name
 *         description:
 *           type: string
 *           description: Agent description
 *         type:
 *           type: string
 *           enum: [DATING, JOB, AD, VISION_SHARE]
 *           description: Agent type / scene type
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED]
 *           description: Agent operational status
 *         config:
 *           type: object
 *           description: L2 behavioral profile — runtime configuration and scene settings
 *         latitude:
 *           type: number
 *           description: Location latitude
 *         longitude:
 *           type: number
 *           description: Location longitude
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Agent creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last modification timestamp
 *     AgentProfile:
 *       type: object
 *       description: Combined L1 + L2 + L3 profile information
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [DATING, JOB, AD, VISION_SHARE]
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED]
 *         config:
 *           type: object
 *           description: L2 behavioral configuration (model, temperature, system prompt, scene metadata, tools)
 *         latitude:
 *           type: number
 *         longitude:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
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
/**
 * @openapi
 * /api/v1/agents/filter:
 *   post:
 *     tags: ['Agents']
 *     summary: Filter agents with complex queries
 *     description: Filter agents using FilterDSL query language for advanced filtering
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FilterAgentsRequest'
 *     responses:
 *       '200':
 *         description: Filtered agents result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *       '400':
 *         description: Invalid FilterDSL query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents/suggestions:
 *   get:
 *     tags: ['Agents']
 *     summary: Get filter suggestions
 *     description: Retrieve available filter suggestions for field autocomplete
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: field
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Filter field name
 *       - name: query
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Search query string
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of suggestions to return
 *     responses:
 *       '200':
 *         description: Filter suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents:
 *   post:
 *     tags: ['Agents']
 *     summary: Create a new agent
 *     description: Create a new AI agent with the specified type, name, description, config, and location
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAgentRequest'
 *     responses:
 *       '201':
 *         description: Agent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents:
 *   get:
 *     tags: ['Agents']
 *     summary: Get all agents
 *     description: Retrieve all agents with optional filtering by type, status, and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [DATING, JOB, AD, VISION_SHARE]
 *         description: Filter by agent type
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED]
 *         description: Filter by agent status
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Page size
 *       - name: sortBy
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - name: sortOrder
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       '200':
 *         description: Paginated list of agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents/search:
 *   get:
 *     tags: ['Agents']
 *     summary: Search agents
 *     description: Search agents by skills, rating, hourly rate, availability, location, language, experience, and verification status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: skills
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated skill names
 *       - name: minRating
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *         description: Minimum rating threshold
 *       - name: maxHourlyRate
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *         description: Maximum hourly rate
 *       - name: availability
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *       - name: location
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Location filter
 *       - name: language
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated language codes
 *       - name: experienceYears
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Minimum years of experience
 *       - name: verified
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - name: sortBy
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Sort field
 *       - name: sortOrder
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Page size
 *     responses:
 *       '200':
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents/sort-options:
 *   get:
 *     tags: ['Agents']
 *     summary: Get sorting options
 *     description: Retrieve available sorting options for agent queries
 *     responses:
 *       '200':
 *         description: Available sort options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [relevance, rating, price, experience, activity, credit, composite]
 */
/**
 * @openapi
 * /api/v1/agents/recommended:
 *   get:
 *     tags: ['Agents']
 *     summary: Get agent recommendations
 *     description: Retrieve personalized agent recommendations for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Page size
 *     responses:
 *       '200':
 *         description: Recommended agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents/filter-suggestions:
 *   get:
 *     tags: ['Agents']
 *     summary: Get filter suggestions (public)
 *     description: Retrieve available filter suggestions without authentication
 *     responses:
 *       '200':
 *         description: Public filter suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
/**
 * @openapi
 * /api/v1/agents/{id}/history:
 *   get:
 *     tags: ['Agents']
 *     summary: Get agent history
 *     description: Retrieve the L3 historical profile — agent interactions, feedback, and performance metrics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent identifier
 *     responses:
 *       '200':
 *         description: Agent history data (L3 profile)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents/{id}:
 *   get:
 *     tags: ['Agents']
 *     summary: Get agent by ID
 *     description: Retrieve a single agent by its UUID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent identifier
 *     responses:
 *       '200':
 *         description: Agent details (L1 profile)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents/{id}:
 *   patch:
 *     tags: ['Agents']
 *     summary: Update agent
 *     description: Update an agent's name, description, config, and location
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAgentRequest'
 *     responses:
 *       '200':
 *         description: Agent updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents/{id}/status:
 *   patch:
 *     tags: ['Agents']
 *     summary: Update agent status
 *     description: Update an agent's operational status (ACTIVE, INACTIVE, SUSPENDED)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAgentStatusRequest'
 *     responses:
 *       '200':
 *         description: Agent status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/agents/{id}:
 *   delete:
 *     tags: ['Agents']
 *     summary: Delete agent
 *     description: Delete an agent by its UUID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent identifier
 *     responses:
 *       '200':
 *         description: Agent deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Agent deleted successfully
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
//# sourceMappingURL=agents.docs.js.map