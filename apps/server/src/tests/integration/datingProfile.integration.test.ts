/**
 * Dating Profile Integration Tests
 * Tests the full HTTP request flow for dating profile CRUD operations using real database
 */

// Set up test environment BEFORE any other imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration-tests';

import { randomUUID } from 'crypto';

import request from 'supertest';
import express, { Express } from 'express';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { prisma } from '../../db/client';
import datingRoutes from '../../routes/dating';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

/**
 * Create a test user in the database and return user info with auth header
 */
async function createTestUser(): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  password?: string;
}> {
  const user = {
    id: randomUUID(),
    email: `test-dating-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    name: 'Test Dating User',
    role: 'user',
    password: 'TestPassword123!',
  };
  const passwordHash = await bcrypt.hash(user.password!, 10);
  await prisma.user.create({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash,
      status: 'ACTIVE',
    },
  });
  return user;
}

/**
 * Create a test agent for the given user
 */
async function createTestAgent(userId: string): Promise<string> {
  const agent = await prisma.agent.create({
    data: {
      id: randomUUID(),
      userId,
      type: 'AGENTDATE',
      name: 'Test Dating Agent',
      status: 'ACTIVE',
    },
  });
  return agent.id;
}

/**
 * Generate JWT auth header for a test user
 */
function getUserAuthHeader(user: { id: string; email: string; role: string }): {
  Authorization: string;
} {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: `test-${user.id}-${Date.now()}`,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { Authorization: `Bearer ${token}` };
}

/**
 * Clean up dating profiles for a specific agent
 */
async function _cleanupDatingProfile(agentId: string): Promise<void> {
  await prisma.datingProfile.deleteMany({
    where: { agentId },
  });
}

/**
 * Clean up agents for a user
 */
async function cleanupAgents(userId: string): Promise<void> {
  // Delete dating profiles first (FK constraint)
  await prisma.datingProfile.deleteMany({
    where: { userId },
  });
  await prisma.agent.deleteMany({
    where: { userId },
  });
}

/**
 * Clean up all test users
 */
async function cleanupTestUsers(): Promise<void> {
  // Delete in correct order due to FK constraints
  await prisma.datingProfile.deleteMany({
    where: { user: { email: { contains: '@example.com' } } },
  });
  await prisma.agent.deleteMany({
    where: { user: { email: { contains: '@example.com' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: '@example.com' } },
  });
}

/**
 * Build a complete profile payload for create/update operations
 */
function buildFullProfilePayload() {
  return {
    basicConditions: {
      ageRange: { min: 25, max: 35 },
      heightRange: { min: 165, max: 185 },
      education: 'bachelor',
      location: { city: 'Beijing', province: 'Beijing' },
    },
    personality: {
      mbti: 'INTJ',
      traits: ['kind', 'humorous', 'responsible'],
      preferredTraits: ['honest', 'caring'],
    },
    interests: {
      interests: [
        { category: 'sports', name: 'running', level: 'intermediate' },
        { category: 'music', name: 'jazz', level: 'casual' },
        { category: 'travel', name: 'backpacking', level: 'experienced' },
      ],
    },
    lifestyle: {
      sleepSchedule: 'early_bird',
      smoking: 'never',
      drinking: 'socially',
      exercise: 'regularly',
    },
    expectations: {
      purpose: 'SERIOUS_RELATIONSHIP',
      pace: 'moderate',
      familyPlan: 'want_children',
    },
    description:
      'I am a kind and responsible person looking for a serious relationship. I enjoy running, listening to jazz, and traveling around the world.',
    privacySettings: {
      profileVisibility: 'PUBLIC',
      fieldVisibility: {
        basicInfo: 'PUBLIC',
        photos: 'PUBLIC',
        income: 'MATCHED_ONLY',
        location: 'MATCHED_ONLY',
        contactInfo: 'PRIVATE',
        personalDetails: 'PUBLIC',
      },
      allowScreenshot: false,
      showOnlineStatus: true,
      hideFromSearch: false,
    },
  };
}

/**
 * Setup test app with dating routes
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/dating', datingRoutes);
  return app;
}

describe('Dating Profile Integration', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('POST /api/v1/dating/agents/:agentId/profile - Create Profile', () => {
    it('should create a dating profile with full data', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.profile).toBeDefined();

      const profile = response.body.data.profile;
      expect(profile.agentId).toBe(agentId);
      expect(profile.basicConditions).toBeDefined();
      expect(profile.basicConditions.ageRange).toEqual({ min: 25, max: 35 });
      expect(profile.personality).toBeDefined();
      expect(profile.personality.mbti).toBe('INTJ');
      expect(profile.interests).toBeDefined();
      expect(profile.interests.interests).toHaveLength(3);
      expect(profile.lifestyle).toBeDefined();
      expect(profile.expectations).toBeDefined();
      expect(profile.expectations.purpose).toBe('SERIOUS_RELATIONSHIP');
      expect(profile.description).toBeDefined();

      await cleanupAgents(user.id);
    });

    it('should create a profile with minimal data', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          basicConditions: {
            ageRange: { min: 22, max: 30 },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toBeDefined();

      await cleanupAgents(user.id);
    });

    it('should return 409 when creating duplicate profile for same agent', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create first profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      // Attempt to create second profile for same agent
      const response = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      expect(response.status).toBe(409);

      await cleanupAgents(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/dating/agents/some-agent-id/profile`)
        .send(buildFullProfilePayload());

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent agent', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .post(`/api/v1/dating/agents/${randomUUID()}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      expect(response.status).toBe(404);

      await cleanupAgents(user.id);
    });
  });

  describe('GET /api/v1/dating/agents/:agentId/profile - Read Profile', () => {
    it('should get an existing dating profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create profile first
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      // Get profile
      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.quality).toBeDefined();
      expect(response.body.data.completion).toBeDefined();

      const profile = response.body.data.profile;
      expect(profile.agentId).toBe(agentId);
      expect(profile.basicConditions).toBeDefined();
      expect(profile.isActive).toBe(true);

      await cleanupAgents(user.id);
    });

    it('should return 404 for non-existent profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(response.status).toBe(404);

      await cleanupAgents(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(`/api/v1/dating/agents/some-agent-id/profile`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/dating/agents/:agentId/profile - Update Profile', () => {
    it('should update an existing profile with partial data', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      // Update profile
      const response = await request(app)
        .put(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          description:
            'Updated description with more details about my life and interests. I love hiking and cooking.',
          lifestyle: {
            sleepSchedule: 'night_owl',
            smoking: 'never',
            drinking: 'rarely',
            exercise: 'daily',
            diet: 'vegetarian',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.quality).toBeDefined();

      const profile = response.body.data.profile;
      expect(profile.description).toContain('Updated description');
      expect(profile.lifestyle.sleepSchedule).toBe('night_owl');
      expect(profile.lifestyle.diet).toBe('vegetarian');
      // Previous fields should still be present (merge behavior)
      expect(profile.basicConditions).toBeDefined();
      expect(profile.personality).toBeDefined();

      await cleanupAgents(user.id);
    });

    it('should update privacy settings', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      // Update privacy settings
      const response = await request(app)
        .put(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          privacySettings: {
            profileVisibility: 'MATCHED_ONLY',
            showOnlineStatus: false,
            hideFromSearch: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const profile = response.body.data.profile;
      expect(profile.privacySettings).toBeDefined();
      expect(profile.privacySettings.profileVisibility).toBe('MATCHED_ONLY');

      await cleanupAgents(user.id);
    });

    it('should return 404 when updating non-existent profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .put(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({ description: 'test' });

      expect(response.status).toBe(404);

      await cleanupAgents(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/dating/agents/some-agent-id/profile`)
        .send({ description: 'test' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/dating/agents/:agentId/profile - Delete Profile', () => {
    it('should delete an existing profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      // Delete profile
      const response = await request(app)
        .delete(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify profile is deleted
      const getResponse = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(getResponse.status).toBe(404);

      await cleanupAgents(user.id);
    });

    it('should return 404 when deleting non-existent profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .delete(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(response.status).toBe(404);

      await cleanupAgents(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete(`/api/v1/dating/agents/some-agent-id/profile`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/dating/agents/:agentId/profile/completeness - Completeness Check', () => {
    it('should return completeness metrics for a full profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create full profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/completeness`)
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const data = response.body.data;
      expect(data.completeness).toBeDefined();
      expect(data.completeness.score).toBeGreaterThanOrEqual(80);
      expect(data.quality).toBeDefined();
      expect(data.readyForMatching).toBeDefined();

      await cleanupAgents(user.id);
    });

    it('should return low completeness for minimal profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create minimal profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          basicConditions: { ageRange: { min: 22, max: 30 } },
        });

      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/completeness`)
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.completeness).toBeDefined();
      expect(data.completeness.missingFields.length).toBeGreaterThan(0);
      expect(data.readyForMatching.ready).toBe(false);

      await cleanupAgents(user.id);
    });

    it('should return 404 for non-existent profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/completeness`)
        .set(headers);

      expect(response.status).toBe(404);

      await cleanupAgents(user.id);
    });
  });

  describe('GET /api/v1/dating/agents/:agentId/profile/quality - Quality Assessment', () => {
    it('should return quality metrics for a profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create full profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/quality`)
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const quality = response.body.data;
      expect(quality.overallScore).toBeDefined();
      expect(typeof quality.overallScore).toBe('number');
      expect(quality.overallScore).toBeGreaterThan(0);
      expect(quality.metrics).toBeDefined();
      expect(quality.metrics.completenessScore).toBeDefined();
      expect(quality.metrics.richnessScore).toBeDefined();
      expect(quality.metrics.matchPotentialScore).toBeDefined();
      expect(quality.recommendations).toBeDefined();

      await cleanupAgents(user.id);
    });

    it('should return recommendations for improving profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create minimal profile to trigger recommendations
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          basicConditions: { ageRange: { min: 25, max: 35 } },
        });

      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/quality`)
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.data.recommendations).toBeDefined();
      expect(response.body.data.recommendations.length).toBeGreaterThan(0);
      expect(response.body.data.metrics.missingCriticalFields.length).toBeGreaterThan(0);

      await cleanupAgents(user.id);
    });

    it('should return 404 for non-existent profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/quality`)
        .set(headers);

      expect(response.status).toBe(404);

      await cleanupAgents(user.id);
    });
  });

  describe('Full CRUD Flow', () => {
    it('should handle complete profile lifecycle', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Step 1: Verify no profile exists
      let res = await request(app).get(`/api/v1/dating/agents/${agentId}/profile`).set(headers);

      expect(res.status).toBe(404);

      // Step 2: Create profile
      res = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send(buildFullProfilePayload());

      expect(res.status).toBe(201);
      expect(res.body.data.profile).toBeDefined();

      // Step 3: Read profile
      res = await request(app).get(`/api/v1/dating/agents/${agentId}/profile`).set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.agentId).toBe(agentId);

      // Step 4: Check completeness
      res = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/completeness`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.completeness.complete).toBe(true);

      // Step 5: Check quality
      res = await request(app).get(`/api/v1/dating/agents/${agentId}/profile/quality`).set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.overallScore).toBeGreaterThan(0);

      // Step 6: Update profile
      res = await request(app)
        .put(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          description:
            'Updated: I am a software engineer who loves outdoor activities and cooking. Looking for someone who shares similar interests and values honesty and kindness above all.',
          personality: {
            mbti: 'ENFJ',
            traits: ['empathetic', 'adventurous', 'creative'],
          },
        });

      expect(res.status).toBe(200);

      // Step 7: Verify update persisted
      res = await request(app).get(`/api/v1/dating/agents/${agentId}/profile`).set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.description).toContain('Updated');
      expect(res.body.data.profile.personality.mbti).toBe('ENFJ');

      // Step 8: Delete profile
      res = await request(app).delete(`/api/v1/dating/agents/${agentId}/profile`).set(headers);

      expect(res.status).toBe(200);

      // Step 9: Verify deletion
      res = await request(app).get(`/api/v1/dating/agents/${agentId}/profile`).set(headers);

      expect(res.status).toBe(404);

      await cleanupAgents(user.id);
    });
  });

  describe('Authorization', () => {
    it('should not allow user to access another user profile', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const agentId = await createTestAgent(user1.id);
      const headers1 = getUserAuthHeader(user1);
      const headers2 = getUserAuthHeader(user2);

      // User 1 creates profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers1)
        .send(buildFullProfilePayload());

      // User 2 tries to read user 1's profile
      const response = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers2);

      expect(response.status).toBe(403);

      await cleanupAgents(user1.id);
      await cleanupAgents(user2.id);
    });

    it('should not allow user to update another user profile', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const agentId = await createTestAgent(user1.id);
      const headers1 = getUserAuthHeader(user1);
      const headers2 = getUserAuthHeader(user2);

      // User 1 creates profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers1)
        .send(buildFullProfilePayload());

      // User 2 tries to update user 1's profile
      const response = await request(app)
        .put(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers2)
        .send({ description: 'Hacked!' });

      expect(response.status).toBe(403);

      await cleanupAgents(user1.id);
      await cleanupAgents(user2.id);
    });

    it('should not allow user to delete another user profile', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const agentId = await createTestAgent(user1.id);
      const headers1 = getUserAuthHeader(user1);
      const headers2 = getUserAuthHeader(user2);

      // User 1 creates profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers1)
        .send(buildFullProfilePayload());

      // User 2 tries to delete user 1's profile
      const response = await request(app)
        .delete(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers2);

      expect(response.status).toBe(403);

      await cleanupAgents(user1.id);
      await cleanupAgents(user2.id);
    });
  });
});
