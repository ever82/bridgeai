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
 *     MatchAlgorithmParams:
 *       type: object
 *       properties:
 *         enableMachineLearning:
 *           type: boolean
 *           default: false
 *           description: Enable ML-based scoring enhancement
 *         weightFactors:
 *           type: object
 *           description: Weight multipliers for each scoring dimension
 *           properties:
 *             compatibility:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               default: 0.4
 *               description: Weight for profile compatibility score
 *             distance:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               default: 0.2
 *               description: Weight for geographic distance factor
 *             activity:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               default: 0.2
 *               description: Weight for user activity level
 *             verification:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               default: 0.2
 *               description: Weight for verification status
 *         minMatchScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           default: 0
 *           description: Minimum score threshold for a match to be returned
 *         maxResultsPerQuery:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *           description: Maximum number of results returned per query
 *     MatchFilterCriteria:
 *       type: object
 *       description: Filter options for narrowing match query results
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, liked, passed, mutual, expired]
 *           description: Filter by match status
 *         minScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Minimum compatibility score threshold
 *         maxScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Maximum compatibility score threshold
 *         excludeLowCredit:
 *           type: boolean
 *           default: false
 *           description: Exclude matches with low credit scores
 *         creditWeight:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           description: Weight factor for credit-based ranking
 *         sortBy:
 *           type: string
 *           enum: [score, createdAt, creditScore]
 *           default: score
 *           description: Field to sort results by
 *         sortOrder:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *           description: Sort direction
 *         excludeMatched:
 *           type: boolean
 *           default: true
 *           description: Exclude already matched targets
 *         maxRadius:
 *           type: number
 *           description: Maximum distance radius in kilometers
 *     MatchListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             matches:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Match'
 *             total:
 *               type: integer
 *               description: Total number of matches matching the query
 *             page:
 *               type: integer
 *               description: Current page number
 *             limit:
 *               type: integer
 *               description: Number of results per page
 *             hasMore:
 *               type: boolean
 *               description: Whether more results are available
 *     MatchDetail:
 *       type: object
 *       description: Detailed match object with nested agent and conversation data
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         demand:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             agentId:
 *               type: string
 *               format: uuid
 *             agent:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *         supply:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             agentId:
 *               type: string
 *               format: uuid
 *             agent:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *         conversation:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             messages:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *         status:
 *           type: string
 *           enum: [pending, liked, passed, mutual, expired]
 *         score:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *     MatchStats:
 *       type: object
 *       properties:
 *         totalMatches:
 *           type: integer
 *           description: Total number of matches for the agent
 *         pendingCount:
 *           type: integer
 *         mutualCount:
 *           type: integer
 *         averageScore:
 *           type: number
 *           description: Average compatibility score across all matches
 */
/**
 * @openapi
 * /api/v1/matches:
 *   get:
 *     tags: ['Matches']
 *     summary: Get user's matches
 *     description: Retrieve a paginated list of matches for the current user's agents. Results are ordered by creation date descending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, liked, passed, mutual, expired]
 *         description: Filter matches by status
 *       - name: minScore
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum compatibility score filter
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results per page
 *     responses:
 *       '200':
 *         description: Paginated list of matches
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MatchListResponse'
 *       '401':
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/matches/{id}:
 *   get:
 *     tags: ['Matches']
 *     summary: Get match details
 *     description: Retrieve detailed information for a specific match, including nested agent profiles and the latest conversation message. Only accessible if the user owns one of the participating agents.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Match ID
 *     responses:
 *       '200':
 *         description: Match detail with agent and conversation data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MatchDetail'
 *       '401':
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Access denied - user is not a participant in this match
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Match not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/matches/query:
 *   post:
 *     tags: ['Matches']
 *     summary: Query match candidates
 *     description: Search for matching agent candidates based on a source agent, with configurable sorting, filtering, and pagination. Uses the multi-dimensional match scoring algorithm.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceAgentId
 *             properties:
 *               sourceAgentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the agent to find matches for
 *               sceneId:
 *                 type: string
 *                 description: Optional scene context for the match query
 *               filter:
 *                 $ref: '#/components/schemas/MatchFilterCriteria'
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *                 description: Maximum number of results to return
 *               offset:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 description: Number of results to skip for pagination
 *               sortBy:
 *                 type: string
 *                 enum: [relevance, distance, credit, createdAt, score]
 *                 default: relevance
 *                 description: Field to sort results by
 *               sortOrder:
 *                 type: string
 *                 enum: [asc, desc]
 *                 default: desc
 *               minScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Minimum compatibility score (0-100)
 *               excludeMatched:
 *                 type: boolean
 *                 default: true
 *                 description: Exclude already matched targets
 *               maxRadius:
 *                 type: number
 *                 description: Maximum distance radius in kilometers
 *           example:
 *             sourceAgentId: '550e8400-e29b-41d4-a716-446655440000'
 *             limit: 10
 *             sortBy: relevance
 *             sortOrder: desc
 *             minScore: 60
 *             excludeMatched: true
 *     responses:
 *       '200':
 *         description: Query results with matched candidates
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
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           agentId:
 *                             type: string
 *                             format: uuid
 *                           score:
 *                             type: number
 *                           reasons:
 *                             type: array
 *                             items:
 *                               type: string
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       '400':
 *         description: Validation error (e.g. missing sourceAgentId, invalid limit or minScore)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/matches/suggestions:
 *   get:
 *     tags: ['Matches']
 *     summary: Get match query suggestions
 *     description: Retrieve suggested query parameters and filters based on the specified scene context to help build effective match queries.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: sceneId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Scene context for generating relevant suggestions
 *     responses:
 *       '200':
 *         description: Query suggestions for match filtering
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
 *                   description: Suggested query parameters and filter options
 *       '401':
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/matches/stats/{agentId}:
 *   get:
 *     tags: ['Matches']
 *     summary: Get agent match statistics
 *     description: Retrieve aggregated match statistics for a specific agent, including total matches, status breakdown, and average score.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: agentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID to get match statistics for
 *     responses:
 *       '200':
 *         description: Match statistics for the agent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MatchStats'
 *       '401':
 *         description: Unauthorized - invalid or missing token
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
//# sourceMappingURL=matches.docs.d.ts.map