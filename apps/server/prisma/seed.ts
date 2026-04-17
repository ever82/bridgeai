import { PrismaClient, SceneCode, UserStatus, AgentType, ChatRoomType, ChatRoomStatus, ConnectionStatus, TransactionType, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化种子数据...');

  // 1. 创建测试用户
  const testUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'user1@bridgeai.com',
        passwordHash: '$2b$10$YourHashedPasswordHere',
        name: '测试用户1',
        phone: '13800138001',
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        email: 'user2@bridgeai.com',
        passwordHash: '$2b$10$YourHashedPasswordHere',
        name: '测试用户2',
        phone: '13800138002',
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        email: 'user3@bridgeai.com',
        passwordHash: '$2b$10$YourHashedPasswordHere',
        name: '测试用户3',
        phone: '13800138003',
        status: UserStatus.ACTIVE,
      },
    }),
  ]);
  console.log(`创建了 ${testUsers.length} 个测试用户`);

  // 2. 创建场景
  const scenes = await Promise.all([
    prisma.scene.create({
      data: {
        code: SceneCode.VISION_SHARE,
        name: 'VisionShare',
        description: '视野分享 - 查看某地实时情况',
        icon: 'camera',
        color: '#4CAF50',
        config: {
          maxDistance: 1000,
          timeWindow: 30,
          creditRequirement: 60,
        },
      },
    }),
    prisma.scene.create({
      data: {
        code: SceneCode.AGENT_DATE,
        name: 'AgentDate',
        description: '交友约会 - 寻找志同道合的朋友',
        icon: 'heart',
        color: '#E91E63',
        config: {
          maxDistance: 50000,
          minAge: 18,
          creditRequirement: 70,
        },
      },
    }),
    prisma.scene.create({
      data: {
        code: SceneCode.AGENT_JOB,
        name: 'AgentJob',
        description: '求职招聘 - 人才与机会匹配',
        icon: 'briefcase',
        color: '#2196F3',
        config: {
          remoteOptions: ['remote', 'hybrid', 'onsite'],
          creditRequirement: 50,
        },
      },
    }),
    prisma.scene.create({
      data: {
        code: SceneCode.AGENT_AD,
        name: 'AgentAd',
        description: '优惠广告 - 发现附近好deal',
        icon: 'tag',
        color: '#FF9800',
        config: {
          maxAdsPerDay: 10,
          creditRequirement: 40,
        },
      },
    }),
  ]);
  console.log(`创建了 ${scenes.length} 个场景`);

  // 3. 为每个用户创建 Agent
  const agents = [];
  for (const user of testUsers) {
    const demandAgent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.DEMAND,
        name: `${user.name}的需求Agent`,
        config: {
          style: 'friendly',
          verbosity: 'medium',
          initiative: 'balanced',
        },
        latitude: 39.9042 + (Math.random() - 0.5) * 0.1,
        longitude: 116.4074 + (Math.random() - 0.5) * 0.1,
        isActive: true,
      },
    });

    const supplyAgent = await prisma.agent.create({
      data: {
        userId: user.id,
        type: AgentType.SUPPLY,
        name: `${user.name}的供给Agent`,
        config: {
          style: 'professional',
          verbosity: 'concise',
          initiative: 'proactive',
        },
        latitude: 39.9042 + (Math.random() - 0.5) * 0.1,
        longitude: 116.4074 + (Math.random() - 0.5) * 0.1,
        isActive: true,
      },
    });

    agents.push(demandAgent, supplyAgent);
  }
  console.log(`创建了 ${agents.length} 个 Agent`);

  // 4. 为每个 Agent 创建各场景的 Profile
  for (const agent of agents) {
    for (const scene of scenes) {
      await prisma.agentProfile.create({
        data: {
          agentId: agent.id,
          sceneId: scene.id,
          l1Data: {
            location: { lat: 39.9042, lng: 116.4074, radius: 5000 },
            category: scene.code.toLowerCase(),
          },
          l2Data: {
            description: `这是 ${agent.name} 在 ${scene.name} 场景的描述`,
            requirements: ['友好', '诚信'],
            capabilities: ['智能匹配', '自动协商'],
          },
          l3Description: `详细描述：${agent.name} 是一个智能Agent，专门在 ${scene.name} 场景下为用户提供服务。`,
          sceneConfig: {
            filters: {
              distance: scene.code === SceneCode.VISION_SHARE ? 1000 : 50000,
              minCredit: 60,
            },
          },
          isActive: true,
        },
      });
    }
  }
  console.log(`创建了 ${agents.length * scenes.length} 个 Agent Profile`);

  // 5. 创建一些示例需求
  const demands = await Promise.all([
    prisma.demand.create({
      data: {
        agentId: agents[0].id,
        title: '想看看三里屯现在堵不堵',
        description: '需要实时的交通路况照片，最好是最近10分钟内拍摄的',
        tags: ['traffic', 'sanlitun', 'realtime'],
        budgetMin: 5.00,
        budgetMax: 20.00,
        latitude: 39.935,
        longitude: 116.455,
        status: 'OPEN',
      },
    }),
    prisma.demand.create({
      data: {
        agentId: agents[2].id,
        title: '想找附近可以聊天的人',
        description: '兴趣爱好：电影、音乐、旅行',
        tags: ['chat', 'friends', 'hobby'],
        latitude: 39.9042,
        longitude: 116.4074,
        status: 'OPEN',
      },
    }),
    prisma.demand.create({
      data: {
        agentId: agents[4].id,
        title: '招聘前端工程师',
        description: '3年以上React经验，熟悉TypeScript',
        tags: ['job', 'frontend', 'react'],
        budgetMin: 20000.00,
        budgetMax: 35000.00,
        latitude: 39.9042,
        longitude: 116.4074,
        status: 'OPEN',
      },
    }),
  ]);
  console.log(`创建了 ${demands.length} 个需求`);

  // 6. 创建一些示例供给
  const supplies = await Promise.all([
    prisma.supply.create({
      data: {
        agentId: agents[1].id,
        title: '我在三里屯附近，可以拍照',
        description: '专业设备，可拍摄高质量照片',
        skills: ['photography', 'sanlitun'],
        hourlyRate: 50.00,
        latitude: 39.935,
        longitude: 116.455,
        availability: { weekdays: true, weekends: true },
        status: 'AVAILABLE',
      },
    }),
    prisma.supply.create({
      data: {
        agentId: agents[3].id,
        title: '周末有空，喜欢认识新朋友',
        description: '性格开朗，喜欢电影和音乐',
        skills: ['chat', 'movies', 'music'],
        latitude: 39.91,
        longitude: 116.41,
        availability: { weekends: true },
        status: 'AVAILABLE',
      },
    }),
    prisma.supply.create({
      data: {
        agentId: agents[5].id,
        title: '5年React开发经验',
        description: '精通React、TypeScript、Node.js',
        skills: ['react', 'typescript', 'nodejs'],
        hourlyRate: 300.00,
        latitude: 39.9042,
        longitude: 116.4074,
        availability: { weekdays: true, remote: true },
        status: 'AVAILABLE',
      },
    }),
  ]);
  console.log(`创建了 ${supplies.length} 个供给`);

  // 7. 创建示例匹配
  const matches = await Promise.all([
    prisma.match.create({
      data: {
        demandId: demands[0].id,
        supplyId: supplies[0].id,
        score: 85.50,
        status: 'PENDING',
        metadata: {
          matchReason: '地理位置匹配',
          distance: 500,
        },
      },
    }),
    prisma.match.create({
      data: {
        demandId: demands[1].id,
        supplyId: supplies[1].id,
        score: 72.00,
        status: 'PENDING',
        metadata: {
          matchReason: '兴趣标签匹配',
        },
      },
    }),
  ]);
  console.log(`创建了 ${matches.length} 个匹配`);

  // 8. 创建示例聊天室
  const chatRooms = await Promise.all([
    prisma.chatRoom.create({
      data: {
        matchId: matches[0].id,
        sceneId: scenes[0].id,
        type: ChatRoomType.QUAD,
        status: ChatRoomStatus.ACTIVE,
        participantIds: [testUsers[0].id, testUsers[1].id],
        metadata: {
          topic: '三里屯路况',
        },
      },
    }),
    prisma.chatRoom.create({
      data: {
        matchId: matches[1].id,
        sceneId: scenes[1].id,
        type: ChatRoomType.QUAD,
        status: ChatRoomStatus.ACTIVE,
        participantIds: [testUsers[1].id, testUsers[2].id],
        metadata: {
          topic: '交友聊天',
        },
      },
    }),
  ]);
  console.log(`创建了 ${chatRooms.length} 个聊天室`);

  // 9. 创建示例消息
  const messages = await Promise.all([
    prisma.chatMessage.create({
      data: {
        chatRoomId: chatRooms[0].id,
        senderId: testUsers[0].id,
        senderType: 'USER',
        content: '你好，我想看看三里屯现在的路况',
        type: 'TEXT',
      },
    }),
    prisma.chatMessage.create({
      data: {
        chatRoomId: chatRooms[0].id,
        senderId: agents[0].id,
        senderType: 'AGENT',
        content: '主人想了解三里屯的交通情况，请问您能提供实时照片吗？',
        type: 'TEXT',
        metadata: { isAgentMessage: true },
      },
    }),
    prisma.chatMessage.create({
      data: {
        chatRoomId: chatRooms[1].id,
        senderId: testUsers[2].id,
        senderType: 'USER',
        content: '嗨，我也喜欢电影和音乐！',
        type: 'TEXT',
      },
    }),
  ]);
  console.log(`创建了 ${messages.length} 条消息`);

  // 10. 创建信用记录和交易
  for (const user of testUsers) {
    // 初始信用分
    await prisma.creditRecord.create({
      data: {
        userId: user.id,
        score: 75,
        delta: 75,
        reason: '初始信用分',
        sourceType: 'SYSTEM',
      },
    });

    // 示例交易
    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: 100.00,
        type: TransactionType.RECHARGE,
        status: TransactionStatus.SUCCESS,
        description: '首次充值',
      },
    });
  }
  console.log(`创建了信用记录和交易`);

  console.log('\n种子数据初始化完成！');
  console.log('测试账号：');
  testUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.email} / password: 任意（未实际验证）`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
