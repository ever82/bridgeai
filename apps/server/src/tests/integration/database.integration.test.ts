/**
 * Database Integration Tests for ISSUE-F002
 * Verifies Prisma ORM configuration, schema models, migrations, and seed data
 *
 * These tests run against a real PostgreSQL database (bridgeai_test)
 * to validate that the schema, relations, indexes, and data operations work correctly.
 */

import {
  PrismaClient,
  AgentType,
  SceneCode,
  UserStatus,
  ChatRoomType,
  ChatRoomStatus,
  ConnectionStatus,
  TransactionType,
  TransactionStatus,
  MessageType,
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

// Helper to create test data and clean up
let createdUserIds: string[] = [];
let createdAgentIds: string[] = [];

async function cleanupTestData() {
  // Delete in reverse dependency order
  await prisma.rating.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.connection.deleteMany({});
  await prisma.chatRoom.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.supply.deleteMany({});
  await prisma.demand.deleteMany({});
  await prisma.agentProfile.deleteMany({});
  await prisma.creditRecord.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.pointsFreeze.deleteMany({});
  await prisma.pointsTransaction.deleteMany({});
  await prisma.pointsAccount.deleteMany({});
  await prisma.agent.deleteMany({ where: { id: { in: createdAgentIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.scene.deleteMany({});
  createdUserIds = [];
  createdAgentIds = [];
}

// ==========================================
// AC1: Prisma ORM Configuration
// ==========================================
describe('AC1: Prisma ORM Configuration', () => {
  it('should connect to database successfully', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    expect(result).toEqual([{ ok: 1 }]);
  });

  it('should have datasource configured as PostgreSQL', async () => {
    const result = await prisma.$queryRaw`SELECT version()`;
    expect(result[0].version).toContain('PostgreSQL');
  });

  it('should use Prisma Client singleton pattern', () => {
    const { prisma: clientPrisma } = require('../../db/client'); // eslint-disable-line @typescript-eslint/no-var-requires
    expect(clientPrisma).toBeDefined();
    expect(typeof clientPrisma.$queryRaw).toBe('function');
  });

  it('should have connection string from environment', () => {
    const dbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
    expect(dbUrl).toBeDefined();
    expect(dbUrl).toContain('postgresql://');
  });
});

// ==========================================
// AC2: Core Entity Models
// ==========================================
describe('AC2: Core Entity Models', () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it('should create User with all required fields', async () => {
    const user = await prisma.user.create({
      data: {
        email: `ac2-test-${Date.now()}@bridgeai.com`,
        passwordHash: '$2b$10$testhash',
        name: 'AC2 Test User',
        phone: '13900001111',
        status: UserStatus.ACTIVE,
      },
    });
    createdUserIds.push(user.id);

    expect(user.id).toBeDefined();
    expect(user.email).toContain('@bridgeai.com');
    expect(user.passwordHash).toBe('$2b$10$testhash');
    expect(user.phone).toBe('13900001111');
    expect(user.name).toBe('AC2 Test User');
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should create Agent with all required fields including creditScore', async () => {
    const user = await prisma.user.create({
      data: {
        email: `ac2-agent-${Date.now()}@bridgeai.com`,
        passwordHash: '$2b$10$testhash',
        name: 'Agent Owner',
      },
    });
    createdUserIds.push(user.id);

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.DEMAND,
        name: 'Test Agent',
        config: { style: 'friendly' },
        latitude: 39.9042,
        longitude: 116.4074,
        isActive: true,
        creditScore: 80,
      },
    });
    createdAgentIds.push(agent.id);

    expect(agent.id).toBeDefined();
    expect(agent.userId).toBe(user.id);
    expect(agent.type).toBe(AgentType.DEMAND);
    expect(agent.name).toBe('Test Agent');
    expect(agent.config).toEqual({ style: 'friendly' });
    expect(agent.creditScore).toBe(80);
    expect(agent.isActive).toBe(true);
  });

  it('should create Agent with default creditScore of 75', async () => {
    const user = await prisma.user.create({
      data: {
        email: `ac2-default-cs-${Date.now()}@bridgeai.com`,
        passwordHash: '$2b$10$testhash',
      },
    });
    createdUserIds.push(user.id);

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.SUPPLY,
        name: 'Default Credit Score Agent',
      },
    });
    createdAgentIds.push(agent.id);

    expect(agent.creditScore).toBe(75);
  });

  it('should create Scene with all four scene codes', async () => {
    const scenes = await Promise.all([
      prisma.scene.create({
        data: { code: SceneCode.VISION_SHARE, name: 'VisionShare', description: '视野分享' },
      }),
      prisma.scene.create({
        data: { code: SceneCode.AGENT_DATE, name: 'AgentDate', description: '交友约会' },
      }),
      prisma.scene.create({
        data: { code: SceneCode.AGENT_JOB, name: 'AgentJob', description: '求职招聘' },
      }),
      prisma.scene.create({
        data: { code: SceneCode.AGENT_AD, name: 'AgentAd', description: '优惠广告' },
      }),
    ]);

    expect(scenes).toHaveLength(4);
    const codes = scenes.map(s => s.code).sort();
    expect(codes).toEqual(['AGENT_AD', 'AGENT_DATE', 'AGENT_JOB', 'VISION_SHARE']);
  });

  it('should create AgentProfile with L1/L2/L3 data', async () => {
    const user = await prisma.user.create({
      data: {
        email: `ac2-profile-${Date.now()}@bridgeai.com`,
        passwordHash: '$2b$10$testhash',
      },
    });
    createdUserIds.push(user.id);

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.DEMAND,
        name: 'Profile Test Agent',
        creditScore: 70,
      },
    });
    createdAgentIds.push(agent.id);

    // Reuse existing scene or create new one
    const scene = await prisma.scene.upsert({
      where: { code: SceneCode.AGENT_JOB },
      update: {},
      create: { code: SceneCode.AGENT_JOB, name: 'TestJob' },
    });

    const profile = await prisma.agentProfile.create({
      data: {
        agentId: agent.id,
        sceneId: scene.id,
        l1Data: { location: { lat: 39.9, lng: 116.4 }, category: 'test' },
        l2Data: { description: 'Test L2', requirements: ['a', 'b'] },
        l3Description: 'Detailed natural language description for the agent profile',
      },
    });

    expect(profile.l1Data).toEqual({ location: { lat: 39.9, lng: 116.4 }, category: 'test' });
    expect(profile.l2Data).toEqual({ description: 'Test L2', requirements: ['a', 'b'] });
    expect(profile.l3Description).toContain('Detailed natural language');
  });

  it('should enforce User email uniqueness', async () => {
    const email = `unique-ac2-${Date.now()}@bridgeai.com`;
    await prisma.user.create({
      data: { email, passwordHash: 'hash' },
    });
    createdUserIds.push((await prisma.user.findUnique({ where: { email } }))!.id);

    await expect(prisma.user.create({ data: { email, passwordHash: 'hash2' } })).rejects.toThrow();
  });
});

// ==========================================
// AC3: Communication Models
// ==========================================
describe('AC3: Communication Models', () => {
  let testUserId: string;
  let testAgentId: string;
  let testChatRoomId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `ac3-test-${Date.now()}@bridgeai.com`,
        passwordHash: '$2b$10$testhash',
        name: 'AC3 Test User',
      },
    });
    testUserId = user.id;
    createdUserIds.push(testUserId);

    const agent = await prisma.agent.create({
      data: {
        userId: testUserId,
        type: AgentType.DEMAND,
        name: 'AC3 Agent',
        creditScore: 60,
      },
    });
    testAgentId = agent.id;
    createdAgentIds.push(testAgentId);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should create ChatRoom with type, participants, and metadata', async () => {
    const chatRoom = await prisma.chatRoom.create({
      data: {
        type: ChatRoomType.QUAD,
        status: ChatRoomStatus.ACTIVE,
        participantIds: [testUserId],
        metadata: { topic: 'test chat' },
      },
    });
    testChatRoomId = chatRoom.id;

    expect(chatRoom.id).toBeDefined();
    expect(chatRoom.type).toBe(ChatRoomType.QUAD);
    expect(chatRoom.status).toBe(ChatRoomStatus.ACTIVE);
    expect(chatRoom.participantIds).toEqual([testUserId]);
    expect(chatRoom.metadata).toEqual({ topic: 'test chat' });
  });

  it('should create ChatMessage with status field for read tracking', async () => {
    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId: testChatRoomId,
        senderId: testUserId,
        senderType: 'USER',
        content: 'Hello, this is a test message',
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
      },
    });

    expect(message.id).toBeDefined();
    expect(message.chatRoomId).toBe(testChatRoomId);
    expect(message.senderId).toBe(testUserId);
    expect(message.content).toBe('Hello, this is a test message');
    expect(message.type).toBe(MessageType.TEXT);
    expect(message.status).toBe(MessageStatus.SENT);
  });

  it('should support MessageStatus transitions (SENT -> DELIVERED -> READ)', async () => {
    const msg = await prisma.chatMessage.create({
      data: {
        chatRoomId: testChatRoomId,
        senderId: testUserId,
        senderType: 'USER',
        content: 'Status transition test',
        status: MessageStatus.SENT,
      },
    });

    const delivered = await prisma.chatMessage.update({
      where: { id: msg.id },
      data: { status: MessageStatus.DELIVERED },
    });
    expect(delivered.status).toBe(MessageStatus.DELIVERED);

    const read = await prisma.chatMessage.update({
      where: { id: msg.id },
      data: { status: MessageStatus.READ },
    });
    expect(read.status).toBe(MessageStatus.READ);
  });

  it('should create Connection with socket and status tracking', async () => {
    const connection = await prisma.connection.create({
      data: {
        userId: testUserId,
        chatRoomId: testChatRoomId,
        socketId: `socket-${Date.now()}`,
        deviceInfo: { type: 'web' },
        status: ConnectionStatus.ONLINE,
      },
    });

    expect(connection.id).toBeDefined();
    expect(connection.socketId).toContain('socket-');
    expect(connection.status).toBe(ConnectionStatus.ONLINE);
  });

  it('should enforce Connection socketId uniqueness', async () => {
    const socketId = `unique-socket-${Date.now()}`;
    await prisma.connection.create({
      data: {
        userId: testUserId,
        socketId,
        status: ConnectionStatus.ONLINE,
      },
    });

    await expect(
      prisma.connection.create({
        data: {
          userId: testUserId,
          socketId,
          status: ConnectionStatus.ONLINE,
        },
      })
    ).rejects.toThrow();
  });
});

// ==========================================
// AC4: Match and Credit Models
// ==========================================
describe('AC4: Match and Credit Models', () => {
  let demandId: string;
  let supplyId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `ac4-test-${Date.now()}@bridgeai.com`,
        passwordHash: '$2b$10$testhash',
      },
    });
    createdUserIds.push(user.id);

    const demandAgent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.DEMAND,
        name: 'Demand Agent',
        creditScore: 70,
      },
    });
    createdAgentIds.push(demandAgent.id);

    const supplyAgent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.SUPPLY,
        name: 'Supply Agent',
        creditScore: 85,
      },
    });
    createdAgentIds.push(supplyAgent.id);

    const demand = await prisma.demand.create({
      data: {
        agentId: demandAgent.id,
        title: 'Test Demand',
        status: DemandStatus.OPEN,
      },
    });
    demandId = demand.id;

    const supply = await prisma.supply.create({
      data: {
        agentId: supplyAgent.id,
        title: 'Test Supply',
        status: SupplyStatus.AVAILABLE,
      },
    });
    supplyId = supply.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should create Match with score and status', async () => {
    const match = await prisma.match.create({
      data: {
        demandId,
        supplyId,
        score: 88.5,
        status: MatchStatus.PENDING,
        metadata: { reason: 'high similarity' },
      },
    });

    expect(Number(match.score)).toBe(88.5);
    expect(match.status).toBe(MatchStatus.PENDING);
    expect(match.demandId).toBe(demandId);
    expect(match.supplyId).toBe(supplyId);
  });

  it('should enforce unique demandId+supplyId on Match', async () => {
    await expect(
      prisma.match.create({
        data: {
          demandId,
          supplyId,
          score: 50.0,
          status: MatchStatus.PENDING,
        },
      })
    ).rejects.toThrow();
  });

  it('should create CreditRecord with score, delta, and reason', async () => {
    const user = await prisma.user.findFirst({
      where: { id: { in: createdUserIds } },
    });
    const record = await prisma.creditRecord.create({
      data: {
        userId: user!.id,
        score: 75,
        delta: 5,
        reason: 'Good rating received',
        sourceType: 'RATING',
      },
    });

    expect(record.score).toBe(75);
    expect(record.delta).toBe(5);
    expect(record.reason).toBe('Good rating received');
  });

  it('should create Transaction with amount, type, and status', async () => {
    const user = await prisma.user.findFirst({
      where: { id: { in: createdUserIds } },
    });
    const txn = await prisma.transaction.create({
      data: {
        userId: user!.id,
        amount: 100.0,
        type: TransactionType.RECHARGE,
        status: TransactionStatus.SUCCESS,
        description: 'Test recharge',
      },
    });

    expect(Number(txn.amount)).toBe(100.0);
    expect(txn.type).toBe(TransactionType.RECHARGE);
    expect(txn.status).toBe(TransactionStatus.SUCCESS);
  });

  it('should create Rating with from/to/score/comment', async () => {
    const match = await prisma.match.findFirst({
      where: { demandId, supplyId },
    });

    const rating = await prisma.rating.create({
      data: {
        matchId: match!.id,
        raterId: createdUserIds[0],
        rateeId: createdUserIds[0],
        score: 5,
        comment: 'Excellent service',
      },
    });

    expect(rating.score).toBe(5);
    expect(rating.comment).toBe('Excellent service');
    expect(rating.raterId).toBe(createdUserIds[0]);
  });
});

// ==========================================
// AC5: Migration Setup
// ==========================================
describe('AC5: Migration Setup', () => {
  it('should have migration tables in database', async () => {
    const result = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    `;
    expect(result).toHaveLength(1);
  });

  it('should have applied migrations', async () => {
    const migrations = (await prisma.$queryRaw`
      SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at
    `) as Array<{ migration_name: string; finished_at: Date | null }>;
    expect(migrations.length).toBeGreaterThan(0);
    for (const m of migrations) {
      expect(m.finished_at).not.toBeNull();
    }
  });

  it('should have migration_lock.toml', () => {
    const fs = require('fs'); // eslint-disable-line @typescript-eslint/no-var-requires
    const path = require('path'); // eslint-disable-line @typescript-eslint/no-var-requires
    const lockPath = path.join(__dirname, '../../../prisma/migrations/migration_lock.toml');
    expect(fs.existsSync(lockPath)).toBe(true);
  });
});

// ==========================================
// AC6: Seed Data and Tools
// ==========================================
describe('AC6: Seed Data and Tools', () => {
  it('should have seed.ts with test data structures', () => {
    const fs = require('fs'); // eslint-disable-line @typescript-eslint/no-var-requires
    const path = require('path'); // eslint-disable-line @typescript-eslint/no-var-requires
    const seedPath = path.join(__dirname, '../../../prisma/seed.ts');
    expect(fs.existsSync(seedPath)).toBe(true);

    const seedContent = fs.readFileSync(seedPath, 'utf-8');
    expect(seedContent).toContain('bridgeai.com');
    expect(seedContent).toContain('AgentType');
    expect(seedContent).toContain('SceneCode');
    expect(seedContent).toContain('ChatRoom');
    expect(seedContent).toContain('creditRecord');
  });

  it('should have db:seed script in package.json', () => {
    const fs = require('fs'); // eslint-disable-line @typescript-eslint/no-var-requires
    const path = require('path'); // eslint-disable-line @typescript-eslint/no-var-requires
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf-8'));
    expect(pkg.scripts['db:seed']).toBeDefined();
    expect(pkg.scripts['db:seed']).toContain('seed');
  });

  it('should have query helper utilities in db/client.ts', () => {
    const { batchQuery, executeWithTimeout, withPerformanceTracking } = require('../../db/client'); // eslint-disable-line @typescript-eslint/no-var-requires
    expect(typeof batchQuery).toBe('function');
    expect(typeof executeWithTimeout).toBe('function');
    expect(typeof withPerformanceTracking).toBe('function');
  });
});

// ==========================================
// AC7: Database Performance Optimization
// ==========================================
describe('AC7: Database Performance Optimization', () => {
  it('should have indexes on Agent table', async () => {
    const indexes = (await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'agents'
    `) as Array<{ indexname: string }>;
    const indexNames = indexes.map(i => i.indexname);
    expect(indexNames.some(n => n.includes('user_id'))).toBe(true);
    expect(indexNames.some(n => n.includes('type'))).toBe(true);
  });

  it('should have indexes on Message/ChatMessage tables', async () => {
    const msgIndexes = (await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'messages'
    `) as Array<{ indexname: string }>;
    expect(msgIndexes.length).toBeGreaterThan(0);

    const chatMsgIndexes = (await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'chat_messages'
    `) as Array<{ indexname: string }>;
    expect(chatMsgIndexes.length).toBeGreaterThan(0);
  });

  it('should have composite index on Agent for geolocation', async () => {
    const indexes = (await prisma.$queryRaw`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'agents'
    `) as Array<{ indexname: string; indexdef: string }>;
    const hasGeoIndex = indexes.some(
      i => i.indexdef.includes('latitude') && i.indexdef.includes('longitude')
    );
    expect(hasGeoIndex).toBe(true);
  });

  it('should have foreign key constraints on Match table', async () => {
    const fks = (await prisma.$queryRaw`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'matches' AND constraint_type = 'FOREIGN KEY'
    `) as Array<{ constraint_name: string }>;
    expect(fks.length).toBeGreaterThanOrEqual(2);
  });

  it('should have indexes on high-traffic tables (Transaction, Connection)', async () => {
    const txIndexes = (await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes WHERE tablename = 'transactions'
    `) as Array<{ indexname: string }>;
    expect(txIndexes.length).toBeGreaterThanOrEqual(3);

    const connIndexes = (await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes WHERE tablename = 'connections'
    `) as Array<{ indexname: string }>;
    expect(connIndexes.length).toBeGreaterThanOrEqual(2);
  });
});
