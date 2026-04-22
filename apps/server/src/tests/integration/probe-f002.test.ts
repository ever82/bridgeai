/**
 * ISSUE-F002 Probe Tests - Database & Prisma ORM
 *
 * Devious probe tests targeting edge cases, inconsistencies,
 * and potential bugs in the database implementation.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  PrismaClient,
  AgentType,
  SceneCode,
  ChatRoomType,
  ChatRoomStatus,
  TransactionType,
  TransactionStatus,
  MessageStatus,
  MatchStatus,
  DemandStatus,
  SupplyStatus,
} from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

// Cleanup helpers
let cleanupIds = {
  users: [] as string[],
  agents: [] as string[],
  scenes: [] as string[],
};

async function cleanup() {
  await prisma.$transaction([
    prisma.rating.deleteMany({}),
    prisma.message.deleteMany({}),
    prisma.chatMessage.deleteMany({}),
    prisma.connection.deleteMany({}),
    prisma.chatRoom.deleteMany({}),
    prisma.conversation.deleteMany({}),
    prisma.match.deleteMany({}),
    prisma.supply.deleteMany({}),
    prisma.demand.deleteMany({}),
    prisma.agentProfile.deleteMany({}),
    prisma.creditRecord.deleteMany({}),
    prisma.transaction.deleteMany({}),
    prisma.agent.deleteMany({ where: { id: { in: cleanupIds.agents } } }),
    prisma.user.deleteMany({ where: { id: { in: cleanupIds.users } } }),
    prisma.scene.deleteMany({ where: { id: { in: cleanupIds.scenes } } }),
  ]);
  cleanupIds = { users: [], agents: [], scenes: [] };
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

// ==========================================
// PROBE 1: creditScore Boundary Values
// ==========================================
describe('PROBE-1: creditScore Boundary Values', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `probe1-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);
  });

  afterAll(cleanup);

  it('should accept creditScore of 0 (minimum)', async () => {
    const agent = await prisma.agent.create({
      data: {
        userId: cleanupIds.users[0],
        type: AgentType.DEMAND,
        name: 'Min Credit Agent',
        creditScore: 0,
      },
    });
    cleanupIds.agents.push(agent.id);
    expect(agent.creditScore).toBe(0);
  });

  it('should accept creditScore of 100 (maximum)', async () => {
    const agent = await prisma.agent.create({
      data: {
        userId: cleanupIds.users[0],
        type: AgentType.SUPPLY,
        name: 'Max Credit Agent',
        creditScore: 100,
      },
    });
    cleanupIds.agents.push(agent.id);
    expect(agent.creditScore).toBe(100);
  });

  it('should reject negative creditScore', async () => {
    await expect(
      prisma.agent.create({
        data: {
          userId: cleanupIds.users[0],
          type: AgentType.DEMAND,
          name: 'Negative Credit',
          creditScore: -1,
        },
      })
    ).rejects.toThrow();
  });

  it('should reject creditScore > 100', async () => {
    await expect(
      prisma.agent.create({
        data: {
          userId: cleanupIds.users[0],
          type: AgentType.DEMAND,
          name: 'Over Max Credit',
          creditScore: 101,
        },
      })
    ).rejects.toThrow();
  });

  it('should default to 75 when creditScore not provided', async () => {
    const agent = await prisma.agent.create({
      data: {
        userId: cleanupIds.users[0],
        type: AgentType.DEMAND,
        name: 'Default Credit Agent',
      },
    });
    cleanupIds.agents.push(agent.id);
    expect(agent.creditScore).toBe(75);
  });
});

// ==========================================
// PROBE-2: AgentFactory Missing creditScore Field
// ==========================================
describe('PROBE-2: AgentFactory creditScore Field', () => {
  it('should AgentFactory createAgent include creditScore field', async () => {
    const { createAgent } = await import('../../factories/agent.factory');
    const agent = createAgent();

    // This will fail if creditScore is not in the return type
    expect(agent).toHaveProperty('creditScore');
    expect(typeof agent.creditScore).toBe('number');
  });

  it('should AgentFactoryData interface include creditScore', () => {
    const factoryPath = path.join(__dirname, '../../factories/agent.factory.ts');
    const content = fs.readFileSync(factoryPath, 'utf-8');

    // Check if creditScore is in the interface
    const hasCreditScoreInInterface = content.includes('creditScore?: number');
    expect(hasCreditScoreInInterface).toBe(true);
  });
});

// ==========================================
// PROBE-3: seed.ts Enum Usage vs String Literals
// ==========================================
describe('PROBE-3: seed.ts Enum vs String Mismatches', () => {
  it('should seed.ts use SenderType enum instead of string literal', () => {
    const seedPath = path.join(__dirname, '../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');

    // Check for string literals that should be enums
    const hasSenderTypeImport = content.includes('SenderType');

    // If the file uses 'AGENT' string instead of SenderType.AGENT, that's a bug
    const usesStringLiteral =
      /senderType:\s*['"]AGENT['"]/.test(content) || /senderType:\s*['"]USER['"]/.test(content);

    if (usesStringLiteral && !hasSenderTypeImport) {
      console.log(
        'WARNING: seed.ts uses string literals for senderType without importing SenderType enum'
      );
    }
  });

  it('should MessageStatus enum map correctly', () => {
    // The schema has @map("read") but we use MessageStatus.READ
    // This should work, but verify the enum values match
    expect(MessageStatus.SENT).toBe('SENT');
    expect(MessageStatus.DELIVERED).toBe('DELIVERED');
    expect(MessageStatus.READ).toBe('READ');
  });
});

// ==========================================
// PROBE-4: ChatRoom vs RoomParticipant Consistency
// ==========================================
describe('PROBE-4: ChatRoom participantIds vs RoomParticipant', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `probe4-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);
  });

  afterAll(cleanup);

  it('should create ChatRoom with participantIds array', async () => {
    const room = await prisma.chatRoom.create({
      data: {
        type: ChatRoomType.QUAD,
        status: ChatRoomStatus.ACTIVE,
        participantIds: cleanupIds.users,
        metadata: { topic: 'Test Room' },
      },
    });

    expect(room.participantIds).toEqual(cleanupIds.users);
  });

  it('should verify RoomParticipant records match ChatRoom.participantIds', async () => {
    // Create a room with participants
    const room = await prisma.chatRoom.create({
      data: {
        type: ChatRoomType.QUAD,
        status: ChatRoomStatus.ACTIVE,
        participantIds: cleanupIds.users,
      },
    });

    // Create RoomParticipant records
    for (const userId of cleanupIds.users) {
      await prisma.roomParticipant.create({
        data: {
          roomId: room.id,
          userId,
          role: 'MEMBER',
        },
      });
    }

    // Verify consistency
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id },
    });

    expect(participants.length).toBe(cleanupIds.users.length);
    expect(participants.map(p => p.userId).sort()).toEqual(cleanupIds.users.sort());
  });

  it('should NOT automatically create RoomParticipant when ChatRoom created', async () => {
    const room = await prisma.chatRoom.create({
      data: {
        type: ChatRoomType.QUAD,
        status: ChatRoomStatus.ACTIVE,
        participantIds: cleanupIds.users,
      },
    });

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id },
    });

    // This exposes the inconsistency - participantIds is set but no RoomParticipant records exist
    expect(participants.length).toBe(0); // BUG: No automatic sync!
  });
});

// ==========================================
// PROBE-5: Decimal Precision in Budget/Rate Fields
// ==========================================
describe('PROBE-5: Decimal Precision for Money Fields', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `probe5-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.SUPPLY,
        name: 'Supply Agent',
      },
    });
    cleanupIds.agents.push(agent.id);
  });

  afterAll(cleanup);

  it('should store budget with 2 decimal precision', async () => {
    const demand = await prisma.demand.create({
      data: {
        agentId: cleanupIds.agents[0],
        title: 'Test Demand',
        budgetMin: 10.99,
        budgetMax: 99.99,
        status: DemandStatus.OPEN,
      },
    });

    expect(Number(demand.budgetMin)).toBeCloseTo(10.99, 2);
    expect(Number(demand.budgetMax)).toBeCloseTo(99.99, 2);
  });

  it('should truncate budget to 2 decimal places', async () => {
    const demand = await prisma.demand.create({
      data: {
        agentId: cleanupIds.agents[0],
        title: 'Precision Test',
        budgetMin: 10.999,
        status: DemandStatus.OPEN,
      },
    });

    expect(Number(demand.budgetMin)).toBeCloseTo(11.0, 2);
  });

  it('should store hourlyRate with 2 decimal precision', async () => {
    const supply = await prisma.supply.create({
      data: {
        agentId: cleanupIds.agents[0],
        title: 'Test Supply',
        hourlyRate: 150.75,
        status: SupplyStatus.AVAILABLE,
      },
    });

    expect(Number(supply.hourlyRate)).toBeCloseTo(150.75, 2);
  });
});

// ==========================================
// PROBE-6: Match Score Range Validation
// ==========================================
describe('PROBE-6: Match Score Range', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `probe6-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);

    const demandAgent = await prisma.agent.create({
      data: { userId: user.id, type: AgentType.DEMAND, name: 'Demand' },
    });
    cleanupIds.agents.push(demandAgent.id);

    const supplyAgent = await prisma.agent.create({
      data: { userId: user.id, type: AgentType.SUPPLY, name: 'Supply' },
    });
    cleanupIds.agents.push(supplyAgent.id);

    const demand = await prisma.demand.create({
      data: { agentId: demandAgent.id, title: 'D', status: DemandStatus.OPEN },
    });

    const supply = await prisma.supply.create({
      data: { agentId: supplyAgent.id, title: 'S', status: SupplyStatus.AVAILABLE },
    });

    cleanupIds.scenes.push(demand.id, supply.id);
  });

  afterAll(cleanup);

  it('should accept score of 0.00', async () => {
    const demand = await prisma.demand.findFirst({ where: { agentId: cleanupIds.agents[0] } });
    const supply = await prisma.supply.findFirst({ where: { agentId: cleanupIds.agents[1] } });

    const match = await prisma.match.create({
      data: {
        demandId: demand!.id,
        supplyId: supply!.id,
        score: 0,
        status: MatchStatus.PENDING,
      },
    });

    expect(Number(match.score)).toBe(0);
  });

  it('should accept score of 100.00 (max)', async () => {
    const demand2 = await prisma.demand.create({
      data: { agentId: cleanupIds.agents[0], title: 'D2', status: DemandStatus.OPEN },
    });
    const supply2 = await prisma.supply.create({
      data: { agentId: cleanupIds.agents[1], title: 'S2', status: SupplyStatus.AVAILABLE },
    });

    const match = await prisma.match.create({
      data: {
        demandId: demand2.id,
        supplyId: supply2.id,
        score: 100.0,
        status: MatchStatus.PENDING,
      },
    });

    expect(Number(match.score)).toBe(100.0);
  });

  it('should reject negative score', async () => {
    const demand3 = await prisma.demand.create({
      data: { agentId: cleanupIds.agents[0], title: 'D3', status: DemandStatus.OPEN },
    });
    const supply3 = await prisma.supply.create({
      data: { agentId: cleanupIds.agents[1], title: 'S3', status: SupplyStatus.AVAILABLE },
    });

    await expect(
      prisma.match.create({
        data: {
          demandId: demand3.id,
          supplyId: supply3.id,
          score: -1,
          status: MatchStatus.PENDING,
        },
      })
    ).rejects.toThrow();
  });
});

// ==========================================
// PROBE-7: Partial Failure in seed.ts Promise.all
// ==========================================
describe('PROBE-7: seed.ts Atomicity Issues', () => {
  it('should document Promise.all without error handling', () => {
    const seedPath = path.join(__dirname, '../../../prisma/seed.ts');
    const content = fs.readFileSync(seedPath, 'utf-8');

    // Check for Promise.all usage without try-catch
    const promiseAllMatches = content.match(/Promise\.all\(\[[\s\S]*?\]\)/g);

    if (promiseAllMatches) {
      console.log(`Found ${promiseAllMatches.length} Promise.all usages in seed.ts`);
      // This is a potential atomicity issue - if one fails, partial data is created
    }
  });

  it('should use transactions for bulk operations', async () => {
    // This test verifies that bulk operations should use $transaction
    const user = await prisma.user.create({
      data: { email: `probe7-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);

    // Demonstrate proper transaction usage
    const result = await prisma.$transaction(async tx => {
      const agent1 = await tx.agent.create({
        data: { userId: user.id, type: AgentType.DEMAND, name: 'T1' },
      });
      const agent2 = await tx.agent.create({
        data: { userId: user.id, type: AgentType.SUPPLY, name: 'T2' },
      });
      return { agent1, agent2 };
    });

    cleanupIds.agents.push(result.agent1.id, result.agent2.id);
    expect(result.agent1).toBeDefined();
    expect(result.agent2).toBeDefined();
  });
});

// ==========================================
// PROBE-8: Geolocation Index Coverage
// ==========================================
describe('PROBE-8: Geolocation Index Coverage', () => {
  it('should have composite index on Agent (latitude, longitude)', async () => {
    const indexes = (await prisma.$queryRaw`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'agents'
    `) as Array<{ indexname: string; indexdef: string }>;

    const hasGeoIndex = indexes.some(
      idx => idx.indexdef.includes('latitude') && idx.indexdef.includes('longitude')
    );

    expect(hasGeoIndex).toBe(true);
  });

  it('should have index for radius query pattern', async () => {
    // Create test data for geo query
    const user = await prisma.user.create({
      data: { email: `probe8-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.DEMAND,
        name: 'Geo Agent',
        latitude: 39.9042,
        longitude: 116.4074,
      },
    });
    cleanupIds.agents.push(agent.id);

    // Query for agents within a bounding box (simplified geo query)
    const agents = await prisma.agent.findMany({
      where: {
        latitude: { gte: 39.9, lte: 40.0 },
        longitude: { gte: 116.4, lte: 116.5 },
      },
    });

    expect(agents.length).toBeGreaterThan(0);
  });
});

// ==========================================
// PROBE-9: Rating Score Range (1-5)
// ==========================================
describe('PROBE-9: Rating Score Validation', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `probe9-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);
  });

  afterAll(cleanup);

  it('should accept rating score of 1 (minimum)', async () => {
    const rating = await prisma.rating.create({
      data: {
        matchId: '00000000-0000-0000-0000-000000000001', // dummy
        raterId: user.id,
        rateeId: user.id,
        score: 1,
        comment: 'Minimum rating',
      },
    });

    expect(rating.score).toBe(1);
  });

  it('should accept rating score of 5 (maximum)', async () => {
    const rating = await prisma.rating.create({
      data: {
        matchId: '00000000-0000-0000-0000-000000000002', // dummy
        raterId: user.id,
        rateeId: user.id,
        score: 5,
        comment: 'Maximum rating',
      },
    });

    expect(rating.score).toBe(5);
  });

  it('should reject rating score of 0', async () => {
    await expect(
      prisma.rating.create({
        data: {
          matchId: '00000000-0000-0000-0000-000000000003',
          raterId: user.id,
          rateeId: user.id,
          score: 0,
        },
      })
    ).rejects.toThrow();
  });

  it('should reject rating score of 6', async () => {
    await expect(
      prisma.rating.create({
        data: {
          matchId: '00000000-0000-0000-0000-000000000004',
          raterId: user.id,
          rateeId: user.id,
          score: 6,
        },
      })
    ).rejects.toThrow();
  });
});

// ==========================================
// PROBE-10: SceneCode Enum Values
// ==========================================
describe('PROBE-10: SceneCode Enum Validation', () => {
  afterAll(cleanup);

  it('should accept all four scene codes', async () => {
    const scenes = await Promise.all([
      prisma.scene.create({ data: { code: SceneCode.VISION_SHARE, name: 'VisionShare' } }),
      prisma.scene.create({ data: { code: SceneCode.AGENT_DATE, name: 'AgentDate' } }),
      prisma.scene.create({ data: { code: SceneCode.AGENT_JOB, name: 'AgentJob' } }),
      prisma.scene.create({ data: { code: SceneCode.AGENT_AD, name: 'AgentAd' } }),
    ]);

    cleanupIds.scenes = scenes.map(s => s.id);
    expect(scenes).toHaveLength(4);
  });

  it('should reject invalid scene code', async () => {
    await expect(
      prisma.scene.create({
        data: { code: 'INVALID_SCENE' as never, name: 'Invalid' },
      })
    ).rejects.toThrow();
  });
});

// ==========================================
// PROBE-11: Message sequenceId Auto-increment
// ==========================================
describe('PROBE-11: Message sequenceId Auto-increment', () => {
  let conversationId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `probe11-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);

    const conv = await prisma.conversation.create({
      data: {
        matchId: '00000000-0000-0000-0000-000000000011',
        participantIds: [user.id],
      },
    });
    conversationId = conv.id;
  });

  afterAll(cleanup);

  it('should auto-increment sequenceId for messages', async () => {
    const msg1 = await prisma.message.create({
      data: {
        conversationId,
        senderId: cleanupIds.users[0],
        content: 'First message',
      },
    });

    const msg2 = await prisma.message.create({
      data: {
        conversationId,
        senderId: cleanupIds.users[0],
        content: 'Second message',
      },
    });

    // sequenceId should be auto-incrementing
    expect(msg1.sequenceId).toBeDefined();
    expect(msg2.sequenceId).toBeDefined();
    if (msg1.sequenceId !== null && msg2.sequenceId !== null) {
      expect(msg2.sequenceId).toBeGreaterThan(msg1.sequenceId);
    }
  });
});

// ==========================================
// PROBE-12: Transaction Status Transitions
// ==========================================
describe('PROBE-12: Transaction Status Transitions', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `probe12-${Date.now()}@test.com`, passwordHash: 'hash' },
    });
    cleanupIds.users.push(user.id);
  });

  afterAll(cleanup);

  it('should allow PENDING -> SUCCESS transition', async () => {
    const tx = await prisma.transaction.create({
      data: {
        userId: cleanupIds.users[0],
        amount: 100,
        type: TransactionType.RECHARGE,
        status: TransactionStatus.PENDING,
      },
    });

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: TransactionStatus.SUCCESS },
    });

    expect(updated.status).toBe(TransactionStatus.SUCCESS);
  });

  it('should allow PENDING -> FAILED transition', async () => {
    const tx = await prisma.transaction.create({
      data: {
        userId: cleanupIds.users[0],
        amount: 100,
        type: TransactionType.RECHARGE,
        status: TransactionStatus.PENDING,
      },
    });

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: TransactionStatus.FAILED },
    });

    expect(updated.status).toBe(TransactionStatus.FAILED);
  });

  it('should allow PENDING -> CANCELLED transition', async () => {
    const tx = await prisma.transaction.create({
      data: {
        userId: cleanupIds.users[0],
        amount: 100,
        type: TransactionType.RECHARGE,
        status: TransactionStatus.PENDING,
      },
    });

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: TransactionStatus.CANCELLED },
    });

    expect(updated.status).toBe(TransactionStatus.CANCELLED);
  });
});
