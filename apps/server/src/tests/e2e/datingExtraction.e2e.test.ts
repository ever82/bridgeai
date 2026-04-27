/**
 * Dating Extraction E2E Tests
 * Tests the complete dating profile creation, AI extraction, and privacy flow
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
import datingRouter from '../../routes/dating';
import { AppError } from '../../errors/AppError';
import { ApiResponse } from '../../utils/response';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

async function createTestUser(): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  password?: string;
}> {
  const user = {
    id: randomUUID(),
    email: `dating-test-${Date.now()}@example.com`,
    name: 'Dating Test User',
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

async function createTestAgent(userId: string): Promise<string> {
  const agentId = randomUUID();
  await prisma.agent.create({
    data: {
      id: agentId,
      userId,
      type: 'AGENTDATE',
      name: 'Dating Agent',
      description: 'Test dating agent for e2e tests',
      status: 'DRAFT',
    },
  });
  return agentId;
}

async function cleanupTestData(): Promise<void> {
  // Delete in dependency order: profiles first, then agents, then users
  await prisma.datingProfile.deleteMany({
    where: { user: { email: { contains: 'dating-test-' } } },
  });
  await prisma.agent.deleteMany({
    where: { user: { email: { contains: 'dating-test-' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: 'dating-test-' } },
  });
}

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
 * Setup test app with dating routes and error handling
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/dating', datingRouter);
  // Error handler so AppError produces proper JSON responses
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        res.status(err.statusCode).json(ApiResponse.error(err.message, err.code));
      } else {
        res
          .status(500)
          .json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
      }
    }
  );
  return app;
}

describe('Dating Extraction E2E', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Complete dating profile creation and extraction flow', () => {
    it('should create a dating profile with natural language description', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      const description =
        'I am a 28-year-old software engineer living in Shanghai. I enjoy hiking, photography, and cooking. I am looking for someone who shares my love of outdoor activities and has a good sense of humor. I value honesty and kindness above all else.';

      // Step 1: Create dating profile with description
      const createRes = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          description,
          basicConditions: {
            age: { min: 24, max: 32 },
            location: { city: 'Shanghai', radiusKm: 50 },
          },
          personality: {
            traits: ['kind', 'humorous', 'honest'],
            communicationStyle: 'direct',
          },
          interests: {
            interests: ['hiking', 'photography', 'cooking'],
          },
          lifestyle: {
            exerciseFrequency: 'often',
            dietPreference: 'no-restriction',
          },
          expectations: {
            purpose: 'long-term',
          },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.profile).toBeDefined();
      expect(createRes.body.data.profile.agentId).toBe(agentId);
      expect(createRes.body.data.profile.description).toBe(description);

      // Step 2: GET the profile to verify it was saved
      const getRes = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.profile).toBeDefined();
      expect(getRes.body.data.profile.description).toBe(description);
      expect(getRes.body.data.profile.basicConditions).toBeDefined();
      expect(getRes.body.data.profile.personality).toBeDefined();
      expect(getRes.body.data.profile.interests).toBeDefined();
      expect(getRes.body.data.quality).toBeDefined();
      expect(getRes.body.data.completion).toBeDefined();

      // Step 3: Check completeness
      const completenessRes = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/completeness`)
        .set(headers);

      expect(completenessRes.status).toBe(200);
      expect(completenessRes.body.success).toBe(true);
      expect(completenessRes.body.data.completeness).toBeDefined();
      expect(completenessRes.body.data.completeness.score).toBeGreaterThan(0);
      expect(completenessRes.body.data.quality).toBeDefined();
      expect(typeof completenessRes.body.data.readyForMatching).toBe('boolean');

      // Step 4: Check quality
      const qualityRes = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile/quality`)
        .set(headers);

      expect(qualityRes.status).toBe(200);
      expect(qualityRes.body.success).toBe(true);
      expect(qualityRes.body.data).toBeDefined();
      expect(qualityRes.body.data.metrics).toBeDefined();
    });

    it('should update profile with AI-extracted structured data', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create initial profile with just a description
      const createRes = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          description: 'I am an outgoing person who loves music and travel.',
        });

      expect(createRes.status).toBe(201);

      // Simulate AI extraction results by updating with structured data
      const extractedBasicConditions = {
        age: { min: 25, max: 35 },
        gender: 'male',
        location: { city: 'Beijing', radiusKm: 30 },
      };
      const extractedPersonality = {
        traits: ['outgoing', 'adventurous', 'creative'],
        communicationStyle: 'open',
      };
      const extractedInterests = {
        interests: ['music', 'travel'],
      };
      const extractedLifestyle = {
        smoking: 'no',
        drinking: 'socially',
      };
      const extractedExpectations = {
        purpose: 'long-term',
        relationshipType: 'monogamous',
      };

      const updateRes = await request(app)
        .put(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          basicConditions: extractedBasicConditions,
          personality: extractedPersonality,
          interests: extractedInterests,
          lifestyle: extractedLifestyle,
          expectations: extractedExpectations,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.profile).toBeDefined();
      expect(updateRes.body.data.profile.basicConditions).toBeDefined();
      expect(updateRes.body.data.profile.personality).toBeDefined();
      expect(updateRes.body.data.profile.interests).toBeDefined();
      expect(updateRes.body.data.profile.lifestyle).toBeDefined();
      expect(updateRes.body.data.profile.expectations).toBeDefined();

      // Verify GET returns the updated data
      const getRes = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.profile.basicConditions).toMatchObject(extractedBasicConditions);
      expect(getRes.body.data.profile.personality).toMatchObject(extractedPersonality);
      expect(getRes.body.data.profile.interests).toMatchObject(extractedInterests);
    });

    it('should handle privacy settings and field visibility', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create profile with custom privacy settings
      const customPrivacy = {
        profileVisibility: 'matched_only',
        fieldVisibility: {
          basicInfo: 'public',
          photos: 'matched_only',
          income: 'private',
          location: 'matched_only',
          contactInfo: 'private',
          personalDetails: 'public',
        },
        allowScreenshot: false,
        showOnlineStatus: false,
        hideFromSearch: true,
      };

      const createRes = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          description: 'Privacy test profile',
          privacySettings: customPrivacy,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.profile.privacySettings).toBeDefined();

      // Update privacy settings
      const updatedPrivacy = {
        profileVisibility: 'public',
        fieldVisibility: {
          basicInfo: 'public',
          photos: 'public',
          income: 'matched_only',
          location: 'public',
          contactInfo: 'private',
          personalDetails: 'public',
        },
        allowScreenshot: true,
        showOnlineStatus: true,
        hideFromSearch: false,
      };

      const updateRes = await request(app)
        .put(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          privacySettings: updatedPrivacy,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.profile.privacySettings).toBeDefined();

      // Verify privacy settings are persisted
      const getRes = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(getRes.status).toBe(200);
      const savedPrivacy = getRes.body.data.profile.privacySettings;
      expect(savedPrivacy).toBeDefined();
      expect(savedPrivacy.hideFromSearch).toBe(false);
    });

    it('should prevent duplicate profile creation for the same agent', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create first profile
      const createRes = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({ description: 'First profile' });

      expect(createRes.status).toBe(201);

      // Attempt to create a second profile for the same agent
      const duplicateRes = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({ description: 'Second profile' });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
    });

    it('should delete a dating profile', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Create profile
      await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({ description: 'To be deleted' });

      // Delete profile
      const deleteRes = await request(app)
        .delete(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify profile is gone
      const getRes = await request(app)
        .get(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers);

      expect(getRes.status).toBe(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const agentId = randomUUID();
      const endpoints = [
        { method: 'GET', path: `/api/v1/dating/agents/${agentId}/profile` },
        { method: 'POST', path: `/api/v1/dating/agents/${agentId}/profile` },
        { method: 'PUT', path: `/api/v1/dating/agents/${agentId}/profile` },
        { method: 'DELETE', path: `/api/v1/dating/agents/${agentId}/profile` },
        { method: 'GET', path: `/api/v1/dating/agents/${agentId}/profile/completeness` },
        { method: 'GET', path: `/api/v1/dating/agents/${agentId}/profile/quality` },
      ];

      for (const { method, path } of endpoints) {
        const res =
          method === 'GET'
            ? await request(app).get(path)
            : method === 'DELETE'
              ? await request(app).delete(path)
              : await request(app).post(path).send({});

        expect(res.status).toBe(401);
      }
    });

    it('should reject invalid profile data', async () => {
      const user = await createTestUser();
      const agentId = await createTestAgent(user.id);
      const headers = getUserAuthHeader(user);

      // Description too long
      const longDescRes = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({ description: 'x'.repeat(2001) });

      expect(longDescRes.status).toBe(400);

      // Invalid radius
      const badRadiusRes = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          description: 'Test',
          basicConditions: { location: { radiusKm: 999 } },
        });

      expect(badRadiusRes.status).toBe(400);

      // Too many interests
      const tooManyInterestsRes = await request(app)
        .post(`/api/v1/dating/agents/${agentId}/profile`)
        .set(headers)
        .send({
          description: 'Test',
          interests: { interests: Array.from({ length: 25 }, (_, i) => `interest-${i}`) },
        });

      expect(tooManyInterestsRes.status).toBe(400);
    });
  });
});
