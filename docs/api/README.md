# BridgeAI API Documentation

**Version:** 1.0.0

BridgeAI Backend API - AI-powered matching and communication platform.

## API Versioning

All endpoints are versioned under `/api/v1/`. When breaking changes are introduced, a new version prefix (e.g., `/api/v2/`) will be created.

**Current version**: v1

**Versioning strategy**:
- URL path versioning (`/api/v1/`, `/api/v2/`)
- Backward-compatible changes (new fields, new endpoints) do not bump version
- Breaking changes (removed fields, changed types) bump version
- Old versions remain available for at least 6 months after deprecation

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
`Authorization: Bearer <token>`

Tokens are obtained via `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.

## Rate Limiting

API requests are rate-limited by IP address. Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when the rate limit resets

## Response Format

All responses follow a standard format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Base URL:** `http://localhost:3000`

**Authentication:** JWT Bearer Token

## API Modules

- **Auth**: Authentication and authorization endpoints
- **Users**: User profile management endpoints
- **Agents**: AI Agent management endpoints
- **Health**: Health check endpoints
- **Scenes**: Scene configuration endpoints
- **Credit**: Credit score endpoints
- **Offers**: Offer and promotion endpoints
- **Merchants**: Merchant management endpoints
- **Reviews**: Review and rating endpoints
- **Jobs**: Job posting and interview endpoints
- **AI**: AI service endpoints
- **Upload**: File upload endpoints
- **Notifications**: Notification management endpoints
- **Location**: Location lookup and geospatial endpoints
- **Chat**: Real-time chat and messaging endpoints
- **Disclosure**: Information disclosure control endpoints
- **Consumer**: Consumer demand agent endpoints
- **Admin**: Admin dashboard and security endpoints

## Endpoints

### `POST` /api/v1/auth/register

**Tags:** Auth  
**Summary:** Register new user  
Create a new user account with email or phone

### `POST` /api/v1/auth/login

**Tags:** Auth  
**Summary:** User login  
Authenticate with email/phone and password, or OAuth provider

### `POST` /api/v1/auth/refresh

**Tags:** Auth  
**Summary:** Refresh access token  
Use refresh token to obtain a new access token

### `POST` /api/v1/auth/logout

**Tags:** Auth  
**Summary:** Logout  
Logout and blacklist the current access token

*Requires authentication*

### `POST` /api/v1/auth/logout-all

**Tags:** Auth  
**Summary:** Logout from all devices  
Invalidate all tokens for the current user

*Requires authentication*

### `POST` /api/v1/auth/forgot-password

**Tags:** Auth  
**Summary:** Request password reset  
Request a password reset email or SMS

### `POST` /api/v1/auth/reset-password

**Tags:** Auth  
**Summary:** Reset password  
Reset password using reset token

### `POST` /api/v1/auth/change-password

**Tags:** Auth  
**Summary:** Change password  
Change password while logged in

*Requires authentication*

### `GET` /api/v1/auth/me

**Tags:** Auth  
**Summary:** Get current user  
Retrieve the currently authenticated user profile

*Requires authentication*

### `DELETE` /api/v1/users/me

**Tags:** Users  
**Summary:** Delete account  
Delete the current user account (soft delete)

*Requires authentication*

### `POST` /api/v1/users/me/avatar

**Tags:** Users  
**Summary:** Update user avatar  
Upload a new avatar image for the current user

*Requires authentication*

### `GET` /api/v1/agents

**Tags:** Agents  
**Summary:** List agents  
Get all agents for the current user with optional filtering and pagination

*Requires authentication*

### `POST` /api/v1/agents

**Tags:** Agents  
**Summary:** Create agent  
Create a new AI agent

*Requires authentication*

### `GET` /api/v1/agents/{id}

**Tags:** Agents  
**Summary:** Get agent by ID  
Retrieve a specific agent by its ID

*Requires authentication*

### `PUT` /api/v1/agents/{id}

**Tags:** Agents  
**Summary:** Update agent  
Update an existing agent

*Requires authentication*

### `DELETE` /api/v1/agents/{id}

**Tags:** Agents  
**Summary:** Delete agent  
Delete an agent

*Requires authentication*

### `PATCH` /api/v1/agents/{id}/status

**Tags:** Agents  
**Summary:** Update agent status  
Update agent active/inactive status

*Requires authentication*

### `GET` /api/v1/agents/{id}/history

**Tags:** Agents  
**Summary:** Get agent status history  
Get the status change history for an agent

*Requires authentication*

### `POST` /api/v1/agents/filter

**Tags:** Agents  
**Summary:** Filter agents with DSL  
Query agents using the BridgeAI Filter DSL

*Requires authentication*

### `GET` /api/v1/agents/search

**Tags:** Agents  
**Summary:** Search agents  
Search agents with smart filtering and sorting

*Requires authentication*

### `GET` /api/v1/agents/recommended

**Tags:** Agents  
**Summary:** Get agent recommendations  
Get personalized agent recommendations based on user preferences

*Requires authentication*

### `GET` /api/v1/agents/sort-options

**Tags:** Agents  
**Summary:** Get sort options  
Get available sorting strategies for agent search

*Requires authentication*

### `GET` /api/v1/agents/filter-suggestions

**Tags:** Agents  
**Summary:** Get filter suggestions  
Get popular filter preset suggestions

*Requires authentication*

### `GET` /api/v1/health

**Tags:** Health  
**Summary:** Basic health check  
Returns basic server health status

### `GET` /api/v1/health/detailed

**Tags:** Health  
**Summary:** Detailed health check  
Returns detailed health status with system metrics

### `GET` /api/v1/scenes

**Tags:** Scenes  
**Summary:** List all scenes  
Get all available scenes (DATING, JOB, AD, VISION_SHARE)

*Requires authentication*

### `GET` /api/v1/scenes/active

**Tags:** Scenes  
**Summary:** List active scenes  
Get all active scenes

*Requires authentication*

### `GET` /api/v1/scenes/{sceneId}

**Tags:** Scenes  
**Summary:** Get scene details  
Get details of a specific scene

*Requires authentication*

### `GET` /api/v1/scenes/{sceneId}/fields

**Tags:** Scenes  
**Summary:** Get scene fields  
Get field configuration for a scene

*Requires authentication*

### `GET` /api/v1/scenes/{sceneId}/capabilities

**Tags:** Scenes  
**Summary:** Get scene capabilities  
Get AI capabilities for a scene

*Requires authentication*

### `GET` /api/v1/credit/score

**Tags:** Credit  
**Summary:** Get credit score  
Get current user credit score

*Requires authentication*

### `GET` /api/v1/credit/history

**Tags:** Credit  
**Summary:** Get credit history  
Get credit score change history

*Requires authentication*

### `GET` /api/v1/credit/factors

**Tags:** Credit  
**Summary:** Get credit factors  
Get credit score factor breakdown

*Requires authentication*

### `GET` /api/v1/credit/level

**Tags:** Credit  
**Summary:** Get credit level  
Get credit level (EXCELLENT/GOOD/GENERAL/POOR)

*Requires authentication*

### `GET` /api/v1/offers

**Tags:** Offers  
**Summary:** List offers  
Get paginated list of offers

*Requires authentication*

### `POST` /api/v1/offers

**Tags:** Offers  
**Summary:** Create offer  
Create a new offer/promotion

*Requires authentication*

### `GET` /api/v1/offers/{id}

**Tags:** Offers  
**Summary:** Get offer  
Get offer details by ID

*Requires authentication*

### `PUT` /api/v1/offers/{id}

**Tags:** Offers  
**Summary:** Update offer  
Update an existing offer

*Requires authentication*

### `DELETE` /api/v1/offers/{id}

**Tags:** Offers  
**Summary:** Delete offer  
Delete an offer

*Requires authentication*

### `PATCH` /api/v1/offers/{id}/status

**Tags:** Offers  
**Summary:** Update offer status  
Change offer status

*Requires authentication*

### `GET` /api/v1/merchants

**Tags:** Merchants  
**Summary:** List merchants  
Get paginated list of merchants

*Requires authentication*

### `POST` /api/v1/merchants

**Tags:** Merchants  
**Summary:** Create merchant  
Create a new merchant

*Requires authentication*

### `GET` /api/v1/merchants/{id}

**Tags:** Merchants  
**Summary:** Get merchant  
Get merchant details by ID

*Requires authentication*

### `PUT` /api/v1/merchants/{id}

**Tags:** Merchants  
**Summary:** Update merchant  
Update merchant information

*Requires authentication*

### `DELETE` /api/v1/merchants/{id}

**Tags:** Merchants  
**Summary:** Delete merchant  
Delete a merchant

*Requires authentication*

### `GET` /api/v1/reviews

**Tags:** Reviews  
**Summary:** List reviews  
Get reviews received or given by user

*Requires authentication*

### `POST` /api/v1/reviews

**Tags:** Reviews  
**Summary:** Create review  
Create a new review

*Requires authentication*

### `POST` /api/v1/upload/avatar

**Tags:** Upload  
**Summary:** Upload avatar  
Upload user avatar image

*Requires authentication*

### `POST` /api/v1/upload/image

**Tags:** Upload  
**Summary:** Upload image  
Upload general image

*Requires authentication*

### `GET` /api/v1/ai/models

**Tags:** AI  
**Summary:** List AI models  
Get available AI models

*Requires authentication*

### `POST` /api/v1/ai/chat

**Tags:** AI  
**Summary:** Chat with AI  
Send a chat message to AI model

*Requires authentication*

### `GET` /api/v1/ai/health

**Tags:** AI  
**Summary:** AI health check  
Check AI service health

*Requires authentication*

### `GET` /api/v1/ai/metrics

**Tags:** AI  
**Summary:** Get AI metrics  
Get AI service usage metrics

*Requires authentication*

### `GET` /api/v1/ai/circuit-breakers

**Tags:** AI  
**Summary:** Get circuit breaker status  
Get status of all AI circuit breakers

*Requires authentication*

### `GET` /api/v1/notifications

**Tags:** Notifications  
**Summary:** List notifications  
Get user notifications with filtering and pagination

*Requires authentication*

### `GET` /api/v1/notifications/unread-count

**Tags:** Notifications  
**Summary:** Get unread count  
Get count of unread notifications, optionally filtered by category

*Requires authentication*

### `GET` /api/v1/jobs

**Tags:** Jobs  
**Summary:** List job postings  
Get paginated job postings list

*Requires authentication*

### `POST` /api/v1/jobs

**Tags:** Jobs  
**Summary:** Create job posting  
Create a new job posting

*Requires authentication*

### `GET` /api/v1/jobs/{id}

**Tags:** Jobs  
**Summary:** Get job posting  
Get job posting details by ID

*Requires authentication*

### `GET` /api/v1/jobs/interviews

**Tags:** Jobs  
**Summary:** List interviews  
Get user interviews list

*Requires authentication*

### `GET` /api/v1/location/provinces

**Tags:** Location  
**Summary:** List all provinces  
Get all provinces in China

### `GET` /api/v1/location/cities/{provinceCode}

**Tags:** Location  
**Summary:** List cities by province  
Get all cities within a province

### `GET` /api/v1/location/districts/{cityCode}

**Tags:** Location  
**Summary:** List districts by city  
Get all districts within a city

### `GET` /api/v1/location/hierarchy

**Tags:** Location  
**Summary:** Get location hierarchy  
Get full province-city-district hierarchy tree

### `GET` /api/v1/location/search

**Tags:** Location  
**Summary:** Search locations  
Search locations by keyword

### `GET` /api/v1/location/agents

**Tags:** Location  
**Summary:** Search agents by location  
Search and filter agents by location with privacy awareness

*Requires authentication*

### `GET` /api/v1/location/agents/nearby

**Tags:** Location  
**Summary:** Find nearby agents  
Find agents within a radius of given coordinates

*Requires authentication*

### `GET` /api/v1/notifications/categories

**Tags:** Notifications  
**Summary:** Get notification categories  
Get available notification categories and counts

*Requires authentication*

### `GET` /api/v1/notifications/stats

**Tags:** Notifications  
**Summary:** Get notification statistics  
Get user notification statistics

*Requires authentication*

### `GET` /api/v1/notifications/latest

**Tags:** Notifications  
**Summary:** Get latest notifications  
Get the most recent notifications

*Requires authentication*

### `GET` /api/v1/notifications/search

**Tags:** Notifications  
**Summary:** Search notifications  
Search notifications by keyword

*Requires authentication*

### `GET` /api/v1/notifications/{id}

**Tags:** Notifications  
**Summary:** Get notification detail  
Get a specific notification by ID

*Requires authentication*

### `PATCH` /api/v1/notifications/{id}

**Tags:** Notifications  
**Summary:** Update notification  
Update notification fields (archive, etc.)

*Requires authentication*

### `DELETE` /api/v1/notifications/{id}

**Tags:** Notifications  
**Summary:** Delete notification  
Delete a notification

*Requires authentication*

### `POST` /api/v1/notifications/{id}/read

**Tags:** Notifications  
**Summary:** Mark as read  
Mark a notification as read

*Requires authentication*

### `POST` /api/v1/notifications/read-all

**Tags:** Notifications  
**Summary:** Mark all as read  
Mark all notifications as read

*Requires authentication*

### `POST` /api/v1/notifications/batch-read

**Tags:** Notifications  
**Summary:** Batch mark as read  
Mark multiple notifications as read

*Requires authentication*

### `GET` /api/v1/credit/user/{userId}

**Tags:** Credit  
**Summary:** Query other user credit  
Query another user's credit score (redacted for privacy)

*Requires authentication*

### `POST` /api/v1/ai/embeddings

**Tags:** AI  
**Summary:** Generate embeddings  
Generate text embeddings using configured LLM

*Requires authentication*

### `GET` /api/v1/ai/stats

**Tags:** AI  
**Summary:** Get AI statistics  
Get AI service usage statistics

*Requires authentication*

### `POST` /api/v1/ai/routing/strategy

**Tags:** AI  
**Summary:** Update routing strategy  
Update the LLM routing strategy

*Requires authentication*

### `POST` /api/v1/ai/extract/extract-demand

**Tags:** AI  
**Summary:** Extract demand from text  
Use AI to extract structured demand from natural language text

### `POST` /api/v1/ai/extract/extract-demand/batch

**Tags:** AI  
**Summary:** Batch demand extraction  
Extract demands from multiple text inputs

### `POST` /api/v1/ai/extract/extract-demand/{id}/confirm

**Tags:** AI  
**Summary:** Confirm extraction result  
Confirm and save an AI extraction result

### `GET` /api/v1/ai/extract/extract-demand/{id}/status

**Tags:** AI  
**Summary:** Get extraction status  
Get the status of a demand extraction job

### `GET` /api/v1/ai/extract/scenes/{scene}/config

**Tags:** AI  
**Summary:** Get scene extraction config  
Get AI extraction configuration for a specific scene

### `POST` /api/v1/ai/extract/offers/extract

**Tags:** AI  
**Summary:** Extract offer from text  
Use AI to extract structured offer from natural language

*Requires authentication*

### `POST` /api/v1/ai/extract/offers/preview

**Tags:** AI  
**Summary:** Preview offer extraction  
Preview AI offer extraction without saving

*Requires authentication*

### `POST` /api/v1/ai/vision/analyze

**Tags:** AI  
**Summary:** Analyze image  
Analyze image content using AI vision model

*Requires authentication*

### `POST` /api/v1/ai/vision/analyze/batch

**Tags:** AI  
**Summary:** Batch analyze images  
Analyze multiple images in a batch

*Requires authentication*

### `POST` /api/v1/ai/vision/moderate

**Tags:** AI  
**Summary:** Moderate image  
Check image content safety

*Requires authentication*

### `POST` /api/v1/ai/vision/ocr

**Tags:** AI  
**Summary:** OCR text extraction  
Extract text from images using OCR

*Requires authentication*

### `POST` /api/v1/ai/vision/search

**Tags:** AI  
**Summary:** Image search by text  
Search images by text description

*Requires authentication*

### `POST` /api/v1/ai/vision/search/similar

**Tags:** AI  
**Summary:** Find similar images  
Find images similar to the given image

*Requires authentication*

### `POST` /api/v1/ai/vision/index

**Tags:** AI  
**Summary:** Index image  
Add an image to the search index

*Requires authentication*

### `POST` /api/v1/ai/vision/describe

**Tags:** AI  
**Summary:** Describe image  
Generate a text description of an image

*Requires authentication*

### `GET` /api/v1/ai/vision/health

**Tags:** AI  
**Summary:** Vision service health  
Check AI vision service health status

*Requires authentication*

### `GET` /api/v1/jobs/my/jobs

**Tags:** Jobs  
**Summary:** Get my job postings  
Get all job postings created by the current user

*Requires authentication*

### `GET` /api/v1/jobs/my/stats

**Tags:** Jobs  
**Summary:** Get my job statistics  
Get statistics for the current user's job postings

*Requires authentication*

### `POST` /api/v1/jobs/{id}/refresh

**Tags:** Jobs  
**Summary:** Refresh job  
Refresh a job posting to bump its position

*Requires authentication*

### `GET` /api/v1/jobs/{id}/stats

**Tags:** Jobs  
**Summary:** Get job statistics  
Get view/apply statistics for a job posting

*Requires authentication*

### `GET` /api/v1/jobs/{id}/applications

**Tags:** Jobs  
**Summary:** Get job applications  
Get applications for a job posting

*Requires authentication*

### `PATCH` /api/v1/jobs/{id}/applications/{applicationId}

**Tags:** Jobs  
**Summary:** Update application status  
Update the status of a job application

*Requires authentication*

### `GET` /api/v1/jobs/{id}/evaluate

**Tags:** Jobs  
**Summary:** Evaluate job quality  
Evaluate job posting quality using AI

*Requires authentication*

### `POST` /api/v1/jobs/extract

**Tags:** Jobs  
**Summary:** AI extract job posting  
Create a job posting from natural language using AI

*Requires authentication*

### `GET` /api/v1/interviews

**Tags:** Jobs  
**Summary:** List interviews  
Get user interview list

### `POST` /api/v1/interviews

**Tags:** Jobs  
**Summary:** Create interview  
Create a new interview appointment

### `GET` /api/v1/interviews/{id}

**Tags:** Jobs  
**Summary:** Get interview  
Get interview details

### `PUT` /api/v1/interviews/{id}

**Tags:** Jobs  
**Summary:** Update interview  
Update interview details

### `GET` /api/v1/interviews/{id}/slots

**Tags:** Jobs  
**Summary:** Get available slots  
Get available interview time slots

### `POST` /api/v1/interviews/{id}/schedule

**Tags:** Jobs  
**Summary:** Schedule interview  
Schedule an interview at a specific time

### `POST` /api/v1/interviews/{id}/cancel

**Tags:** Jobs  
**Summary:** Cancel interview  
Cancel an interview appointment

### `POST` /api/v1/interviews/{id}/complete

**Tags:** Jobs  
**Summary:** Complete interview  
Mark an interview as completed

### `POST` /api/v1/interviews/{id}/feedback

**Tags:** Jobs  
**Summary:** Submit feedback  
Submit interview feedback

### `GET` /api/v1/interviews/{id}/feedback

**Tags:** Jobs  
**Summary:** Get feedback  
Get interview feedback

### `GET` /api/v1/interviews/{id}/aggregate-feedback

**Tags:** Jobs  
**Summary:** Get aggregated feedback  
Get aggregated interview feedback for a job

### `GET` /api/v1/chats/rooms

**Tags:** Chat  
**Summary:** List chat rooms  
Get user chat room list with pagination

*Requires authentication*

### `POST` /api/v1/chats/rooms

**Tags:** Chat  
**Summary:** Create chat room  
Create a new chat room (4-party group by default)

*Requires authentication*

### `GET` /api/v1/chats/rooms/search

**Tags:** Chat  
**Summary:** Search chat rooms  
Search chat rooms by name or participants

*Requires authentication*

### `GET` /api/v1/chats/rooms/{id}

**Tags:** Chat  
**Summary:** Get room detail  
Get chat room details

*Requires authentication*

### `PATCH` /api/v1/chats/rooms/{id}

**Tags:** Chat  
**Summary:** Update room  
Update chat room metadata or settings

*Requires authentication*

### `DELETE` /api/v1/chats/rooms/{id}

**Tags:** Chat  
**Summary:** Close room  
Close/archive a chat room

*Requires authentication*

### `POST` /api/v1/chats/rooms/{id}/read

**Tags:** Chat  
**Summary:** Mark room as read  
Mark all messages in a room as read

*Requires authentication*

### `GET` /api/v1/chats/rooms/{id}/participants

**Tags:** Chat  
**Summary:** Get participants  
Get all participants in a room

*Requires authentication*

### `POST` /api/v1/chats/rooms/{id}/participants

**Tags:** Chat  
**Summary:** Add participant  
Add a participant to the room

*Requires authentication*

### `GET` /api/v1/chats/rooms/{id}/messages

**Tags:** Chat  
**Summary:** Get messages  
Get message history for a room with pagination

*Requires authentication*

### `GET` /api/v1/chats/rooms/{id}/sync

**Tags:** Chat  
**Summary:** Sync messages  
Incrementally sync messages since a timestamp

*Requires authentication*

### `GET` /api/v1/chats/rooms/{id}/search

**Tags:** Chat  
**Summary:** Search messages  
Search messages within a room

*Requires authentication*

### `GET` /api/v1/disclosure/levels/info

**Tags:** Disclosure  
**Summary:** Get disclosure levels info  
Get available disclosure levels and their descriptions (no auth required)

### `GET` /api/v1/disclosure/{agentId}/preview

**Tags:** Disclosure  
**Summary:** Preview disclosure for roles  
Preview what each viewer role would see for an agent

*Requires authentication*

### `GET` /api/v1/disclosure/{agentId}/history

**Tags:** Disclosure  
**Summary:** Get disclosure history  
Get disclosure level change history

*Requires authentication*

### `GET` /api/v1/disclosure/{agentId}/access-log

**Tags:** Disclosure  
**Summary:** Get access audit log  
Get access audit log for disclosure changes

*Requires authentication*

### `GET` /api/v1/disclosure/{agentId}/stats

**Tags:** Disclosure  
**Summary:** Get disclosure statistics  
Get statistics on disclosure settings for an agent

*Requires authentication*

### `GET` /api/v1/consumer/agents/consumer/{agentId}/preview

**Tags:** Consumer  
**Summary:** Get demand profile preview  
Preview the complete consumer demand profile

*Requires authentication*

### `POST` /api/v1/consumer/agents/consumer/{agentId}/publish

**Tags:** Consumer  
**Summary:** Publish demand  
Publish the consumer demand to make it visible to merchants

*Requires authentication*

### `GET` /admin/security/stats

**Tags:** Admin  
**Summary:** Get security stats  
Security overview dashboard statistics

*Requires authentication*

### `GET` /admin/security/realtime

**Tags:** Admin  
**Summary:** Get real-time security data  
Real-time security monitoring data

*Requires authentication*

### `GET` /admin/security/ddos

**Tags:** Admin  
**Summary:** Get DDoS stats  
DDoS protection statistics

*Requires authentication*

### `GET` /admin/security/blocked-ips

**Tags:** Admin  
**Summary:** Get blocked IPs  
List of blocked IP addresses

*Requires authentication*

### `POST` /admin/security/blocked-ips

**Tags:** Admin  
**Summary:** Block IP  
Add an IP to the block list

*Requires authentication*

### `DELETE` /admin/security/blocked-ips

**Tags:** Admin  
**Summary:** Unblock IP  
Remove an IP from the block list

*Requires authentication*

### `GET` /admin/security/whitelist

**Tags:** Admin  
**Summary:** Get whitelisted IPs  
List of whitelisted IP addresses

*Requires authentication*

### `POST` /admin/security/whitelist

**Tags:** Admin  
**Summary:** Add to whitelist  
Add an IP to the whitelist

*Requires authentication*

### `GET` /admin/security/events

**Tags:** Admin  
**Summary:** Get security events  
List security events with filtering

*Requires authentication*

### `PATCH` /admin/security/events/{id}/resolve

**Tags:** Admin  
**Summary:** Resolve security event  
Mark a security event as resolved

*Requires authentication*

### `GET` /api/v1/auth/oauth/{provider}

**Tags:** Auth  
**Summary:** Get OAuth authorization URL  
Get OAuth authorization URL for a provider (wechat, google, etc.)

### `DELETE` /api/v1/auth/oauth/{provider}

**Tags:** Auth  
**Summary:** Unbind OAuth account  
Unbind an OAuth account from the current user

*Requires authentication*

### `GET` /api/v1/auth/oauth/{provider}/callback

**Tags:** Auth  
**Summary:** OAuth callback  
Handle OAuth callback from provider

### `POST` /api/v1/auth/oauth/{provider}/bind

**Tags:** Auth  
**Summary:** Bind OAuth account  
Bind an OAuth account to the current user

*Requires authentication*

### `GET` /api/v1/auth/oauth/connections

**Tags:** Auth  
**Summary:** Get OAuth connections  
Get all OAuth accounts connected to the current user

*Requires authentication*

### `GET` /api/v1/users/privacy

**Tags:** Users  
**Summary:** Get privacy settings  
Get current user privacy settings

*Requires authentication*

### `PUT` /api/v1/users/privacy

**Tags:** Users  
**Summary:** Update privacy settings  
Update user privacy settings

*Requires authentication*

### `POST` /api/v1/users/password

**Tags:** Users  
**Summary:** Change password  
Change user account password

*Requires authentication*

### `GET` /api/v1/users/devices

**Tags:** Users  
**Summary:** Get user devices  
Get all devices logged into this account

*Requires authentication*

### `DELETE` /api/v1/users/devices/{deviceId}

**Tags:** Users  
**Summary:** Remove device  
Remove a device from the account

*Requires authentication*

### `POST` /api/v1/users/block

**Tags:** Users  
**Summary:** Block a user  
Block another user from contacting you

*Requires authentication*

### `POST` /api/v1/users/unblock

**Tags:** Users  
**Summary:** Unblock a user  
Unblock a previously blocked user

*Requires authentication*

### `GET` /api/v1/users/blocked

**Tags:** Users  
**Summary:** Get blocked users  
Get list of blocked users

*Requires authentication*


---

*Generated on 2026-04-29T05:02:05.245Z*

Interactive docs: [Swagger UI](/api-docs)
