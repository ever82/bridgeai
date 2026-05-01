/**
 * Demo Data Seed Script
 *
 * Creates preset demo accounts and scenario data for product demonstration.
 * This script is idempotent — it skips records that already exist (by unique email/phone).
 */

import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  SceneCode,
  UserStatus,
  AgentType,
  AgentStatus,
  DemandStatus,
  SupplyStatus,
  ChatRoomType,
  ChatRoomStatus,
  SenderType,
  MessageStatus,
  MessageType,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';

// ---------------------------------------------------------------------------
// 5 Preset Demo Accounts
// ---------------------------------------------------------------------------
const DEMO_USERS = [
  {
    email: 'test-e2e@bridgeai.test',
    name: 'E2E Test User',
    displayName: 'E2E Test User',
    phone: null,
    bio: '自动化验收测试账号，用于 play-story E2E 验证',
  },
  {
    email: 'demo-vision@bridgeai.com',
    name: 'Alice (VisionShare)',
    displayName: 'Alice',
    phone: '13800000001',
    bio: 'VisionShare 场景演示用户，喜欢拍照分享实时情况',
  },
  {
    email: 'demo-date@bridgeai.com',
    name: 'Bob (AgentDate)',
    displayName: 'Bob',
    phone: '13800000002',
    bio: 'AgentDate 场景演示用户，热爱电影和户外运动',
  },
  {
    email: 'demo-job@bridgeai.com',
    name: 'Carol (AgentJob)',
    displayName: 'Carol',
    phone: '13800000003',
    bio: 'AgentJob 场景演示用户，5年全栈开发经验',
  },
  {
    email: 'demo-ad@bridgeai.com',
    name: 'David (AgentAd)',
    displayName: 'David',
    phone: '13800000004',
    bio: 'AgentAd 场景演示商家，经营咖啡馆',
  },
  {
    email: 'demo-admin@bridgeai.com',
    name: 'Eve (Admin)',
    displayName: 'Eve',
    phone: '13800000005',
    bio: '演示管理员账号',
  },
] as const;

// ---------------------------------------------------------------------------
// 10 Example Tasks across scenes
// ---------------------------------------------------------------------------
const DEMO_VISIONSHARE_TASKS = [
  {
    title: '望京SOHO附近路况',
    description: '需要望京SOHO附近最近的交通状况照片',
    category: 'traffic',
    tags: ['traffic', 'wangjing', 'realtime'],
    latitude: 39.9942,
    longitude: 116.4742,
    locationName: '望京SOHO',
    status: 'PUBLISHED',
  },
  {
    title: '三里屯现在人多吗',
    description: '想了解三里屯太古里周末人流量情况',
    category: 'crowd',
    tags: ['crowd', 'sanlitun', 'weekend'],
    latitude: 39.935,
    longitude: 116.455,
    locationName: '三里屯太古里',
    status: 'PUBLISHED',
  },
  {
    title: '国贸附近停车方便吗',
    description: '需要国贸CBD附近停车场的实时空位信息',
    category: 'parking',
    tags: ['parking', 'guomao', 'cbd'],
    latitude: 39.9087,
    longitude: 116.4605,
    locationName: '国贸CBD',
    status: 'PUBLISHED',
  },
];

const DEMO_DEMANDS = [
  // AgentDate demands
  {
    title: '找周末一起爬山的朋友',
    description: '喜欢户外运动，希望认识志同道合的伙伴',
    tags: ['outdoor', 'hiking', 'weekend'],
    budgetMin: 0,
    budgetMax: 0,
    latitude: 39.9042,
    longitude: 116.4074,
    status: DemandStatus.OPEN,
  },
  {
    title: '找电影搭子',
    description: '喜欢科幻和悬疑片，希望找到一起看电影的朋友',
    tags: ['movie', 'sci-fi', 'thriller'],
    budgetMin: 0,
    budgetMax: 0,
    latitude: 39.9042,
    longitude: 116.4074,
    status: DemandStatus.OPEN,
  },
  // AgentJob demands
  {
    title: '招聘高级前端工程师',
    description: '5年以上React经验，熟悉TypeScript和Node.js',
    tags: ['job', 'frontend', 'react', 'senior'],
    budgetMin: 30000,
    budgetMax: 50000,
    latitude: 39.9042,
    longitude: 116.4074,
    status: DemandStatus.OPEN,
  },
  {
    title: '寻找UI/UX设计师',
    description: '3年以上移动端设计经验，熟悉Figma',
    tags: ['job', 'design', 'ui', 'ux', 'figma'],
    budgetMin: 20000,
    budgetMax: 35000,
    latitude: 39.9042,
    longitude: 116.4074,
    status: DemandStatus.OPEN,
  },
];

const DEMO_SUPPLIES = [
  // AgentDate supplies
  {
    title: '周末有空，喜欢户外活动',
    description: '每周六日都有空，喜欢爬山、骑行',
    skills: ['outdoor', 'hiking', 'cycling'],
    hourlyRate: 0,
    latitude: 39.92,
    longitude: 116.42,
    availability: { weekends: true },
    status: SupplyStatus.AVAILABLE,
  },
  // AgentJob supplies
  {
    title: '6年React全栈开发',
    description: '精通React、TypeScript、Node.js、PostgreSQL',
    skills: ['react', 'typescript', 'nodejs', 'postgresql'],
    hourlyRate: 400,
    latitude: 39.9042,
    longitude: 116.4074,
    availability: { weekdays: true, remote: true },
    status: SupplyStatus.AVAILABLE,
  },
  {
    title: '资深UI设计师',
    description: '5年移动端设计经验，擅长电商和社交产品',
    skills: ['figma', 'sketch', 'ui', 'ux', 'mobile'],
    hourlyRate: 350,
    latitude: 39.91,
    longitude: 116.41,
    availability: { weekdays: true, remote: true },
    status: SupplyStatus.AVAILABLE,
  },
];

async function seedDemo() {
  console.log('=== 开始创建演示数据 ===\n');

  const PASSWORD_HASH = await bcrypt.hash(DEMO_PASSWORD, 12);

  // -----------------------------------------------------------------------
  // 1. Create / verify demo users
  // -----------------------------------------------------------------------
  const users = [];
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  [skip] 用户已存在: ${u.email}`);
      users.push(existing);
      continue;
    }
    const user = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: PASSWORD_HASH,
        name: u.name,
        displayName: u.displayName,
        phone: u.phone,
        bio: u.bio,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`  [created] 用户: ${u.email}`);
    users.push(user);
  }

  // -----------------------------------------------------------------------
  // 2. Create scenes (if not exist)
  // -----------------------------------------------------------------------
  const sceneDefs = [
    {
      code: SceneCode.VISION_SHARE,
      name: 'VisionShare',
      description: '视野分享 - 查看某地实时情况',
      icon: 'camera',
      color: '#4CAF50',
    },
    {
      code: SceneCode.AGENT_DATE,
      name: 'AgentDate',
      description: '交友约会 - 寻找志同道合的朋友',
      icon: 'heart',
      color: '#E91E63',
    },
    {
      code: SceneCode.AGENT_JOB,
      name: 'AgentJob',
      description: '求职招聘 - 人才与机会匹配',
      icon: 'briefcase',
      color: '#2196F3',
    },
    {
      code: SceneCode.AGENT_AD,
      name: 'AgentAd',
      description: '优惠广告 - 发现附近好deal',
      icon: 'tag',
      color: '#FF9800',
    },
  ];
  const scenes = [];
  for (const s of sceneDefs) {
    const existing = await prisma.scene.findUnique({ where: { code: s.code } });
    if (existing) {
      scenes.push(existing);
      continue;
    }
    const scene = await prisma.scene.create({ data: s });
    scenes.push(scene);
  }
  console.log(`  场景就绪: ${scenes.length} 个\n`);

  // -----------------------------------------------------------------------
  // 3. Create agents for each user
  // -----------------------------------------------------------------------
  const agentTypeMap: Record<number, AgentType> = {
    0: AgentType.VISIONSHARE,
    1: AgentType.AGENTDATE,
    2: AgentType.AGENTJOB,
    3: AgentType.AGENTAD,
    4: AgentType.DEMAND, // admin gets a generic agent
  };
  const agents = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const type = agentTypeMap[i] ?? AgentType.DEMAND;

    // Check if agent already exists
    const existing = await prisma.agent.findFirst({
      where: { userId: user.id, type },
    });
    if (existing) {
      agents.push(existing);
      continue;
    }

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        type,
        name: `${user.displayName}的${type}Agent`,
        status: AgentStatus.ACTIVE,
        config: { style: 'friendly', verbosity: 'medium', initiative: 'balanced' },
        latitude: 39.9042 + (Math.random() - 0.5) * 0.1,
        longitude: 116.4074 + (Math.random() - 0.5) * 0.1,
        isActive: true,
        creditScore: 80,
      },
    });
    agents.push(agent);
  }
  console.log(`  Agents 就绪: ${agents.length} 个\n`);

  // -----------------------------------------------------------------------
  // 4. VisionShare tasks (user 0 = Alice)
  // -----------------------------------------------------------------------
  const vsUser = users[0];
  const _vsAgent = agents[0];
  for (const t of DEMO_VISIONSHARE_TASKS) {
    const existing = await prisma.visionShareTask.findFirst({
      where: { userId: vsUser.id, title: t.title },
    });
    if (existing) continue;

    await prisma.visionShareTask.create({
      data: {
        userId: vsUser.id,
        title: t.title,
        description: t.description,
        category: t.category,
        tags: t.tags,
        latitude: t.latitude,
        longitude: t.longitude,
        locationName: t.locationName,
        status: t.status,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });
  }
  console.log(`  VisionShare 任务: ${DEMO_VISIONSHARE_TASKS.length} 个\n`);

  // -----------------------------------------------------------------------
  // 5. Demands (AgentDate + AgentJob)
  // -----------------------------------------------------------------------
  // demands[0,1] from user[1] Bob (AgentDate), demands[2,3] from user[2] Carol (AgentJob)
  const demandAgentMap = [agents[1], agents[1], agents[2], agents[2]];
  const demands = [];
  for (let i = 0; i < DEMO_DEMANDS.length; i++) {
    const d = DEMO_DEMANDS[i];
    const agent = demandAgentMap[i];
    const existing = await prisma.demand.findFirst({
      where: { agentId: agent.id, title: d.title },
    });
    if (existing) {
      demands.push(existing);
      continue;
    }
    const demand = await prisma.demand.create({
      data: {
        agentId: agent.id,
        title: d.title,
        description: d.description,
        tags: d.tags,
        budgetMin: d.budgetMin,
        budgetMax: d.budgetMax,
        latitude: d.latitude,
        longitude: d.longitude,
        status: d.status,
      },
    });
    demands.push(demand);
  }
  console.log(`  Demands: ${demands.length} 个\n`);

  // -----------------------------------------------------------------------
  // 6. Supplies (AgentDate + AgentJob)
  // -----------------------------------------------------------------------
  // supplies[0] from user[1] Bob (AgentDate), supplies[1,2] from user[2] Carol (AgentJob)
  const supplyAgentMap = [agents[1], agents[2], agents[2]];
  const supplies = [];
  for (let i = 0; i < DEMO_SUPPLIES.length; i++) {
    const s = DEMO_SUPPLIES[i];
    const agent = supplyAgentMap[i];
    const existing = await prisma.supply.findFirst({
      where: { agentId: agent.id, title: s.title },
    });
    if (existing) {
      supplies.push(existing);
      continue;
    }
    const supply = await prisma.supply.create({
      data: {
        agentId: agent.id,
        title: s.title,
        description: s.description,
        skills: s.skills,
        hourlyRate: s.hourlyRate,
        latitude: s.latitude,
        longitude: s.longitude,
        availability: s.availability,
        status: s.status,
      },
    });
    supplies.push(supply);
  }
  console.log(`  Supplies: ${supplies.length} 个\n`);

  // -----------------------------------------------------------------------
  // 7. AgentAd - Create merchant and offer for user[3] David
  // -----------------------------------------------------------------------
  const _davidUser = users[3];
  const davidAgent = agents[3];
  const existingMerchant = await prisma.merchant.findUnique({
    where: { agentId: davidAgent.id },
  });
  if (!existingMerchant) {
    const merchant = await prisma.merchant.create({
      data: {
        agentId: davidAgent.id,
        name: "David's Coffee",
        address: '北京市朝阳区建国路88号',
        phone: '010-88888888',
        category: 'coffee',
        description: '精品咖啡馆，提供手冲咖啡和甜点',
        status: 'ACTIVE',
      },
    });

    await prisma.offer.create({
      data: {
        merchantId: merchant.id,
        title: '新用户首杯半价',
        description: '首次到店消费任意饮品享半价优惠',
        type: 'PERCENTAGE',
        discountValue: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalStock: 100,
        remainingStock: 100,
        status: 'ACTIVE',
      },
    });
    console.log(`  Merchant + Offer 已创建\n`);
  } else {
    console.log(`  [skip] Merchant 已存在\n`);
  }

  // -----------------------------------------------------------------------
  // 8. Matches and ChatRooms
  // -----------------------------------------------------------------------
  if (demands.length >= 2 && supplies.length >= 2) {
    // Match: dating demand <-> dating supply
    const existingMatch1 = await prisma.match.findUnique({
      where: { demandId_supplyId: { demandId: demands[0].id, supplyId: supplies[0].id } },
    });
    if (!existingMatch1) {
      const match1 = await prisma.match.create({
        data: {
          demandId: demands[0].id,
          supplyId: supplies[0].id,
          score: 82.0,
          status: 'PENDING',
          metadata: { matchReason: '兴趣标签匹配: outdoor, hiking' },
        },
      });

      const chatRoom = await prisma.chatRoom.create({
        data: {
          matchId: match1.id,
          sceneId: scenes[1].id,
          type: ChatRoomType.QUAD,
          status: ChatRoomStatus.ACTIVE,
          participantIds: [users[1].id, users[1].id],
          metadata: { topic: '周末爬山' },
        },
      });

      // Seed a few demo messages
      await prisma.chatMessage.createMany({
        data: [
          {
            chatRoomId: chatRoom.id,
            senderId: users[1].id,
            senderType: SenderType.USER,
            content: '你好！我看到你也喜欢爬山，周末有计划吗？',
            type: MessageType.TEXT,
            status: MessageStatus.READ,
          },
          {
            chatRoomId: chatRoom.id,
            senderId: agents[1].id,
            senderType: SenderType.AGENT,
            content:
              '我的主人 Bob 喜欢户外运动，特别是爬山和骑行。周末通常都有空，可以一起安排活动！',
            type: MessageType.TEXT,
            status: MessageStatus.READ,
            metadata: { isAgentMessage: true },
          },
        ],
      });
      console.log(`  匹配 + 聊天室 + 消息已创建\n`);
    }

    // Match: job demand <-> job supply
    const existingMatch2 = await prisma.match.findUnique({
      where: { demandId_supplyId: { demandId: demands[2].id, supplyId: supplies[1].id } },
    });
    if (!existingMatch2) {
      await prisma.match.create({
        data: {
          demandId: demands[2].id,
          supplyId: supplies[1].id,
          score: 91.5,
          status: 'ACCEPTED',
          metadata: { matchReason: '技能高度匹配: react, typescript, nodejs' },
        },
      });
      console.log(`  AgentJob 匹配已创建\n`);
    }
  }

  // -----------------------------------------------------------------------
  // 9. Credit records and transactions for each demo user
  // -----------------------------------------------------------------------
  for (const user of users) {
    const existingCredit = await prisma.creditRecord.findFirst({
      where: { userId: user.id, reason: '演示初始信用分' },
    });
    if (existingCredit) continue;

    await prisma.creditRecord.create({
      data: {
        userId: user.id,
        score: 80,
        delta: 80,
        reason: '演示初始信用分',
        sourceType: 'SYSTEM',
      },
    });

    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: 200.0,
        type: TransactionType.RECHARGE,
        status: TransactionStatus.SUCCESS,
        description: '演示充值',
      },
    });
  }
  console.log(`  信用记录和交易已创建\n`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('=== 演示数据创建完成 ===\n');
  console.log('预设账号 (密码统一为: Demo1234!):');
  DEMO_USERS.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} — ${u.name}`);
  });
  console.log('\n场景数据:');
  console.log(`  VisionShare 任务: ${DEMO_VISIONSHARE_TASKS.length} 个`);
  console.log(`  AgentDate 需求: 2 个 + 供给: 1 个`);
  console.log(`  AgentJob  需求: 2 个 + 供给: 2 个`);
  console.log(`  AgentAd   商家: 1 个 + 优惠: 1 个`);
  console.log(
    `  总任务数: ${DEMO_VISIONSHARE_TASKS.length + DEMO_DEMANDS.length + DEMO_SUPPLIES.length + 1} (含 VisionShare 任务)`
  );
}

seedDemo()
  .catch(e => {
    console.error('演示数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
