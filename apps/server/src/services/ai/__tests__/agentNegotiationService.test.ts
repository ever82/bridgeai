/**
 * Agent Negotiation Service Tests
 * Agent优惠协商谈判服务测试
 */

import {
  AgentNegotiationService,
  NegotiationRoom,
  AgentInfo,
  ConsumerProfile,
  MerchantProfile,
  MerchantOffer,
  FollowUpQuestion,
} from '../agentNegotiationService';
import { llmService } from '../llmService';
import { metricsService } from '../metricsService';

// Mock dependencies
jest.mock('../llmService');
jest.mock('../metricsService');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AgentNegotiationService', () => {
  let service: AgentNegotiationService;

  const mockConsumerAgent: AgentInfo = {
    id: 'consumer-1',
    type: 'consumer',
    name: '消费者Agent',
    profile: {
      userId: 'user-1',
      preferences: ['电子产品', '手机'],
      budgetRange: { min: 3000, max: 6000 },
      brandPreferences: ['Apple', '华为'],
    } as ConsumerProfile,
  };

  const mockMerchantAgents: AgentInfo[] = [
    {
      id: 'merchant-1',
      type: 'merchant',
      name: '京东旗舰店',
      profile: {
        merchantId: 'm1',
        businessName: '京东旗舰店',
        businessType: '电商平台',
        rating: 4.8,
        offers: [],
      } as MerchantProfile,
    },
    {
      id: 'merchant-2',
      type: 'merchant',
      name: '天猫官方店',
      profile: {
        merchantId: 'm2',
        businessName: '天猫官方店',
        businessType: '品牌直营',
        rating: 4.9,
        offers: [],
      } as MerchantProfile,
    },
    {
      id: 'merchant-3',
      type: 'merchant',
      name: '拼多多专营店',
      profile: {
        merchantId: 'm3',
        businessName: '拼多多专营店',
        businessType: '专营店',
        rating: 4.5,
        offers: [],
      } as MerchantProfile,
    },
  ];

  const mockConsumerDemand = {
    category: '手机',
    productName: 'iPhone 15',
    budget: { min: 5000, max: 7000 },
    brandPreferences: ['Apple'],
    requirements: ['全新正品', '有保修'],
    timeline: '本周内购买',
  };

  const mockMerchantOffer: MerchantOffer = {
    id: 'offer-1',
    title: 'iPhone 15 限时特惠',
    description: '全新iPhone 15，立减500元',
    discountType: 'fixed',
    discountValue: 500,
    minPurchase: 5000,
    validFrom: '2026-04-01',
    validTo: '2026-04-30',
    applicableProducts: ['iPhone 15'],
    terms: ['仅限新用户'],
    hiddenBenefits: ['赠送手机壳', '免邮费'],
  };

  beforeEach(() => {
    service = new AgentNegotiationService();
    jest.clearAllMocks();

    // Mock LLM service
    (llmService.generateText as jest.Mock).mockResolvedValue({
      text: 'Mocked response',
      provider: 'openai',
      model: 'gpt-4',
      usage: { input: 100, output: 50, total: 150 },
      cost: 0.01,
      latencyMs: 500,
    });

    // Mock metrics service
    (metricsService.recordRequest as jest.Mock).mockResolvedValue(undefined);
  });

  describe('createNegotiationRoom', () => {
    it('should create a negotiation room successfully', async () => {
      const room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      expect(room).toBeDefined();
      expect(room.id).toMatch(/^room-/);
      expect(room.type).toBe('AGENT_AD_NEGOTIATION');
      expect(room.consumerAgent.id).toBe(mockConsumerAgent.id);
      expect(room.merchantAgents).toHaveLength(3);
      expect(room.status).toBe('created');
      expect(room.context.consumerDemand).toEqual(mockConsumerDemand);
      expect(room.context.merchantOffers.size).toBe(0);
    });

    it('should throw error if less than 2 merchant agents', async () => {
      await expect(
        service.createNegotiationRoom(mockConsumerAgent, [mockMerchantAgents[0]], mockConsumerDemand)
      ).rejects.toThrow('At least 2 merchant agents are required');
    });

    it('should apply custom config', async () => {
      const room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand,
        { maxRounds: 10, autoNegotiate: false }
      );

      expect(room.context.negotiationState.maxRounds).toBe(10);
    });
  });

  describe('generateConsumerIntroduction', () => {
    let room: NegotiationRoom;

    beforeEach(async () => {
      room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );
    });

    it('should generate consumer introduction message', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: '大家好，我想购买iPhone 15，预算5000-7000元，希望获得优惠方案。',
        provider: 'openai',
        model: 'gpt-4',
        usage: { input: 200, output: 100, total: 300 },
        cost: 0.02,
        latencyMs: 800,
      });

      const message = await service.generateConsumerIntroduction(room.id);

      expect(message).toBeDefined();
      expect(message.senderId).toBe(mockConsumerAgent.id);
      expect(message.senderType).toBe('consumer');
      expect(message.messageType).toBe('introduction');
      expect(message.content).toContain('iPhone 15');
    });

    it('should update room status to negotiating', async () => {
      await service.generateConsumerIntroduction(room.id);

      const updatedRoom = service.getRoom(room.id);
      expect(updatedRoom.status).toBe('negotiating');
    });

    it('should throw error for non-existent room', async () => {
      await expect(service.generateConsumerIntroduction('non-existent')).rejects.toThrow(
        'Room non-existent not found'
      );
    });
  });

  describe('generateMerchantOfferPresentation', () => {
    let room: NegotiationRoom;

    beforeEach(async () => {
      room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );
    });

    it('should generate merchant offer presentation', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: '您好！我们店iPhone 15正在做活动，立减500元，还有赠品！',
        provider: 'openai',
        model: 'gpt-4',
        usage: { input: 150, output: 80, total: 230 },
        cost: 0.015,
        latencyMs: 600,
      });

      const message = await service.generateMerchantOfferPresentation(
        room.id,
        'merchant-1',
        mockMerchantOffer
      );

      expect(message).toBeDefined();
      expect(message.senderId).toBe('merchant-1');
      expect(message.senderType).toBe('merchant');
      expect(message.messageType).toBe('offer');
      expect(message.metadata?.offerId).toBe(mockMerchantOffer.id);
    });

    it('should store offer in room context', async () => {
      await service.generateMerchantOfferPresentation(room.id, 'merchant-1', mockMerchantOffer);

      const updatedRoom = service.getRoom(room.id);
      const storedOffers = updatedRoom.context.merchantOffers.get('merchant-1');
      expect(storedOffers).toHaveLength(1);
      expect(storedOffers?.[0].id).toBe(mockMerchantOffer.id);
    });

    it('should throw error for non-existent merchant', async () => {
      await expect(
        service.generateMerchantOfferPresentation(room.id, 'non-existent', mockMerchantOffer)
      ).rejects.toThrow('Merchant non-existent not found in room');
    });
  });

  describe('generateFollowUpQuestions', () => {
    let room: NegotiationRoom;

    beforeEach(async () => {
      room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      // Add an offer first
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: '优惠展示',
        provider: 'openai',
        model: 'gpt-4',
        usage: { input: 100, output: 50, total: 150 },
        cost: 0.01,
        latencyMs: 500,
      });
      await service.generateMerchantOfferPresentation(room.id, 'merchant-1', mockMerchantOffer);
    });

    it('should generate follow-up questions', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify({
          questions: [
            {
              question: '这个优惠可以叠加其他优惠券吗？',
              type: 'stacking',
              context: '了解优惠叠加规则',
            },
            {
              question: '有效期可以延长吗？',
              type: 'validity',
              context: '确认时间灵活性',
            },
          ],
        }),
        provider: 'openai',
        model: 'gpt-4',
        usage: { input: 300, output: 150, total: 450 },
        cost: 0.03,
        latencyMs: 900,
      });

      const questions = await service.generateFollowUpQuestions(room.id, 'merchant-1');

      expect(questions).toHaveLength(2);
      expect(questions[0].question).toContain('叠加');
      expect(questions[0].questionType).toBe('stacking');
      expect(questions[0].targetMerchantId).toBe('merchant-1');
    });

    it('should return empty array on parse error', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: 'Invalid JSON',
        provider: 'openai',
        model: 'gpt-4',
        usage: { input: 100, output: 50, total: 150 },
        cost: 0.01,
        latencyMs: 500,
      });

      const questions = await service.generateFollowUpQuestions(room.id, 'merchant-1');
      expect(questions).toEqual([]);
    });
  });

  describe('executeFollowUpQuestion', () => {
    let room: NegotiationRoom;
    const mockQuestion: FollowUpQuestion = {
      question: '可以再多给点折扣吗？',
      targetMerchantId: 'merchant-1',
      questionType: 'discount',
      context: '尝试争取更多优惠',
    };

    beforeEach(async () => {
      room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      await service.generateMerchantOfferPresentation(room.id, 'merchant-1', mockMerchantOffer);
    });

    it('should execute follow-up question and generate response', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: '如果您今天下单，我可以额外申请50元优惠！',
        provider: 'openai',
        model: 'gpt-4',
        usage: { input: 150, output: 80, total: 230 },
        cost: 0.015,
        latencyMs: 600,
      });

      const response = await service.executeFollowUpQuestion(room.id, mockQuestion);

      expect(response).toBeDefined();
      expect(response.senderId).toBe('merchant-1');
      expect(response.messageType).toBe('response');
    });

    it('should add question and response to room messages', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: '可以的！',
        provider: 'openai',
        model: 'gpt-4',
      });

      await service.executeFollowUpQuestion(room.id, mockQuestion);

      const updatedRoom = service.getRoom(room.id);
      expect(updatedRoom.messages).toHaveLength(3); // offer + question + response
      expect(updatedRoom.messages[1].messageType).toBe('question');
      expect(updatedRoom.messages[2].messageType).toBe('response');
    });

    it('should update negotiation state', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: '好的！',
        provider: 'openai',
        model: 'gpt-4',
      });

      await service.executeFollowUpQuestion(room.id, mockQuestion);

      const updatedRoom = service.getRoom(room.id);
      expect(updatedRoom.context.negotiationState.currentRound).toBe(1);
      expect(updatedRoom.context.negotiationState.topicsDiscussed).toContain('discount');
    });
  });

  describe('compareOffers', () => {
    let room: NegotiationRoom;

    beforeEach(async () => {
      room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      // Add offers from different merchants
      const offer1 = { ...mockMerchantOffer, id: 'offer-1' };
      const offer2 = {
        ...mockMerchantOffer,
        id: 'offer-2',
        title: 'iPhone 15 超级特惠',
        discountValue: 800,
      };
      const offer3 = {
        ...mockMerchantOffer,
        id: 'offer-3',
        title: 'iPhone 15 组合优惠',
        discountType: 'bundle' as const,
        discountValue: 1000,
      };

      await service.generateMerchantOfferPresentation(room.id, 'merchant-1', offer1);
      await service.generateMerchantOfferPresentation(room.id, 'merchant-2', offer2);
      await service.generateMerchantOfferPresentation(room.id, 'merchant-3', offer3);
    });

    it('should compare multiple offers', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify({
          offers: [
            {
              offerId: 'offer-1',
              merchantId: 'merchant-1',
              scores: { value: 70, match: 85, convenience: 80, overall: 78 },
              pros: ['品牌可靠', '物流快'],
              cons: ['优惠力度一般'],
            },
            {
              offerId: 'offer-2',
              merchantId: 'merchant-2',
              scores: { value: 85, match: 90, convenience: 85, overall: 87 },
              pros: ['优惠大', '正品保证'],
              cons: ['库存有限'],
            },
            {
              offerId: 'offer-3',
              merchantId: 'merchant-3',
              scores: { value: 90, match: 75, convenience: 70, overall: 78 },
              pros: ['优惠最大'],
              cons: ['需要凑单', '流程复杂'],
            },
          ],
          summary: '天猫官方店综合评分最高，建议优先考虑',
          bestValueOffer: 'offer-3',
          bestMatchOffer: 'offer-2',
        }),
        provider: 'openai',
        model: 'gpt-4',
        usage: { input: 500, output: 300, total: 800 },
        cost: 0.05,
        latencyMs: 1500,
      });

      const result = await service.compareOffers(room.id);

      expect(result).toBeDefined();
      expect(result.offers).toHaveLength(3);
      expect(result.summary).toContain('天猫');
      expect(result.bestMatchOffer).toBe('offer-2');
    });

    it('should throw error if less than 2 offers', async () => {
      const newRoom = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      await expect(service.compareOffers(newRoom.id)).rejects.toThrow(
        'At least 2 offers are required for comparison'
      );
    });

    it('should update room status to comparing', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify({
          offers: [],
          summary: 'Test',
        }),
        provider: 'openai',
        model: 'gpt-4',
      });

      await service.compareOffers(room.id);

      const updatedRoom = service.getRoom(room.id);
      expect(updatedRoom.status).toBe('comparing');
    });
  });

  describe('generateRecommendation', () => {
    let room: NegotiationRoom;

    beforeEach(async () => {
      room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      // Add offers and comparison
      const offer1 = { ...mockMerchantOffer, id: 'offer-1' };
      const offer2 = { ...mockMerchantOffer, id: 'offer-2', discountValue: 800 };

      await service.generateMerchantOfferPresentation(room.id, 'merchant-1', offer1);
      await service.generateMerchantOfferPresentation(room.id, 'merchant-2', offer2);

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify({
          offers: [
            {
              offerId: 'offer-1',
              merchantId: 'merchant-1',
              scores: { value: 70, match: 85, convenience: 80, overall: 78 },
              pros: ['可靠'],
              cons: ['优惠小'],
            },
            {
              offerId: 'offer-2',
              merchantId: 'merchant-2',
              scores: { value: 90, match: 90, convenience: 85, overall: 88 },
              pros: ['优惠大', '服务好'],
              cons: [],
            },
          ],
          summary: '天猫店更好',
          bestValueOffer: 'offer-2',
          bestMatchOffer: 'offer-2',
        }),
        provider: 'openai',
        model: 'gpt-4',
      });

      await service.compareOffers(room.id);
    });

    it('should generate recommendation', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify({
          recommendedOfferId: 'offer-2',
          recommendedMerchantId: 'merchant-2',
          recommendationReason:
            '天猫官方店优惠力度最大(800元)，且品牌可靠、服务有保障，最符合您的需求。',
          alternativeOffers: ['offer-1'],
          confidence: 0.92,
          savingsEstimate: { amount: 800, percentage: 13 },
        }),
        provider: 'openai',
        model: 'gpt-4',
        usage: { input: 400, output: 200, total: 600 },
        cost: 0.04,
        latencyMs: 1000,
      });

      const result = await service.generateRecommendation(room.id);

      expect(result).toBeDefined();
      expect(result.recommendedOfferId).toBe('offer-2');
      expect(result.recommendedMerchantId).toBe('merchant-2');
      expect(result.confidence).toBe(0.92);
      expect(result.savingsEstimate).toEqual({ amount: 800, percentage: 13 });
    });

    it('should throw error if comparison not performed', async () => {
      const newRoom = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      await expect(service.generateRecommendation(newRoom.id)).rejects.toThrow(
        'Comparison must be performed before generating recommendation'
      );
    });
  });

  describe('confirmSelection', () => {
    let room: NegotiationRoom;

    beforeEach(async () => {
      room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );
    });

    it('should confirm selection and complete room', async () => {
      const result = await service.confirmSelection(room.id, 'offer-1', true);

      expect(result.status).toBe('completed');
      const lastMessage = result.messages[result.messages.length - 1];
      expect(lastMessage.messageType).toBe('system');
      expect(lastMessage.content).toContain('已确认');
    });

    it('should reject selection and return to negotiating', async () => {
      const result = await service.confirmSelection(room.id, 'offer-1', false);

      expect(result.status).toBe('negotiating');
    });
  });

  describe('getRoom', () => {
    it('should return existing room', async () => {
      const room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      const retrieved = service.getRoom(room.id);
      expect(retrieved.id).toBe(room.id);
    });

    it('should throw error for non-existent room', () => {
      expect(() => service.getRoom('non-existent')).toThrow('Room non-existent not found');
    });
  });

  describe('getAllRooms', () => {
    it('should return all rooms', async () => {
      await service.createNegotiationRoom(mockConsumerAgent, mockMerchantAgents, mockConsumerDemand);
      await service.createNegotiationRoom(mockConsumerAgent, mockMerchantAgents, mockConsumerDemand);

      const rooms = service.getAllRooms();
      expect(rooms).toHaveLength(2);
    });
  });

  describe('getRoomMessages', () => {
    it('should return room messages', async () => {
      const room = await service.createNegotiationRoom(
        mockConsumerAgent,
        mockMerchantAgents,
        mockConsumerDemand
      );

      await service.generateMerchantOfferPresentation(room.id, 'merchant-1', mockMerchantOffer);

      const messages = service.getRoomMessages(room.id);
      expect(messages).toHaveLength(1);
    });
  });

  describe('getVersion', () => {
    it('should return version', () => {
      expect(service.getVersion()).toBe('1.0.0');
    });
  });
});
