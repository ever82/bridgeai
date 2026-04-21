/**
 * Salary Negotiation Service
 * AI驱动的薪资协商服务
 */

import { LLMService } from '../ai/llmService';
import {
  NegotiationRoom,
  NegotiationMessage,
  MessageSender,
  NegotiationTopic,
  NegotiationStatus
} from '../../models/NegotiationRoom';
import { getSalaryNegotiationPrompt } from '../../ai/prompts/salaryNegotiation';

import { negotiationRoomService } from './negotiationRoom';

export interface MarketData {
  position: string;
  location: string;
  experienceYears: number;
  marketRange: {
    min: number;
    max: number;
    median: number;
  };
  industry: string;
  companySize: string;
}

export interface NegotiationContext {
  room: NegotiationRoom;
  messages: NegotiationMessage[];
  marketData?: MarketData;
  jobSeekerProfile?: {
    currentSalary?: number;
    expectedMin?: number;
    expectedMax?: number;
    priorityTopics: NegotiationTopic[];
  };
  employerProfile?: {
    budgetMin?: number;
    budgetMax?: number;
    priorityTopics: NegotiationTopic[];
    flexibilityScore: number; // 0-100
  };
}

export interface NegotiationStrategy {
  approach: 'collaborative' | 'competitive' | 'compromising' | 'accommodating';
  keyPoints: string[];
  concessions: string[];
  bottomLine: number;
  targetAmount: number;
  reasoning: string;
}

export interface CounterOffer {
  amount: number;
  reasoning: string;
  conditions?: string[];
  benefits?: string[];
  deadline?: Date;
}

export interface NegotiationAnalysis {
  currentGap: number;
  percentageGap: number;
  suggestedCompromise: number;
  winWinOpportunities: string[];
  riskAreas: string[];
  nextMoveSuggestion: string;
}

export class SalaryNegotiationService {
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  /**
   * Generate negotiation strategy for an agent
   */
  async generateStrategy(
    context: NegotiationContext,
    isJobSeeker: boolean
  ): Promise<NegotiationStrategy> {
    const prompt = getSalaryNegotiationPrompt('strategy', {
      room: context.room,
      messages: context.messages,
      isJobSeeker,
      marketData: context.marketData ? {
        position: context.marketData.position,
        location: context.marketData.location,
        experienceYears: context.marketData.experienceYears,
        marketRange: context.marketData.marketRange,
      } : undefined,
      jobSeekerProfile: context.jobSeekerProfile,
      employerProfile: context.employerProfile,
    });

    try {
      const response = await this.llmService.chatCompletion({
        model: 'claude-sonnet-4-6',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.7,
        maxTokens: 2000
      });

      // Parse the response to extract strategy
      const content = response.choices[0]?.message?.content || '';
      return this.parseStrategyResponse(content, isJobSeeker, context);
    } catch (error) {
      console.error('Failed to generate strategy:', error);
      // Return default strategy
      return this.getDefaultStrategy(isJobSeeker, context);
    }
  }

  /**
   * Generate a counter offer
   */
  async generateCounterOffer(
    context: NegotiationContext,
    isJobSeeker: boolean,
    lastOffer?: number
  ): Promise<CounterOffer> {
    const prompt = getSalaryNegotiationPrompt('counter_offer', {
      room: context.room,
      messages: context.messages,
      isJobSeeker,
      lastOffer,
      marketData: context.marketData ? {
        position: context.marketData.position,
        location: context.marketData.location,
        experienceYears: context.marketData.experienceYears,
        marketRange: context.marketData.marketRange,
      } : undefined,
      jobSeekerProfile: context.jobSeekerProfile,
      employerProfile: context.employerProfile,
    });

    try {
      const response = await this.llmService.chatCompletion({
        model: 'claude-sonnet-4-6',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.6,
        maxTokens: 1500
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseCounterOfferResponse(content, context);
    } catch (error) {
      console.error('Failed to generate counter offer:', error);
      return this.getDefaultCounterOffer(isJobSeeker, context, lastOffer);
    }
  }

  /**
   * Analyze negotiation situation
   */
  async analyzeNegotiation(context: NegotiationContext): Promise<NegotiationAnalysis> {
    const prompt = getSalaryNegotiationPrompt('analysis', {
      room: context.room,
      messages: context.messages,
      marketData: context.marketData ? {
        position: context.marketData.position,
        location: context.marketData.location,
        experienceYears: context.marketData.experienceYears,
        marketRange: context.marketData.marketRange,
      } : undefined,
    });

    try {
      const response = await this.llmService.chatCompletion({
        model: 'claude-sonnet-4-6',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.5,
        maxTokens: 2000
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseAnalysisResponse(content, context);
    } catch (error) {
      console.error('Failed to analyze negotiation:', error);
      return this.getDefaultAnalysis(context);
    }
  }

  /**
   * Generate negotiation message
   */
  async generateMessage(
    context: NegotiationContext,
    isJobSeeker: boolean,
    messageType: 'opening' | 'counter' | 'compromise' | 'closing' | 'response'
  ): Promise<{
    content: string;
    isCounterOffer: boolean;
    offerValue?: number;
    topic?: NegotiationTopic;
  }> {
    const prompt = getSalaryNegotiationPrompt('message', {
      room: context.room,
      messages: context.messages,
      isJobSeeker,
      messageType,
      marketData: context.marketData ? {
        position: context.marketData.position,
        location: context.marketData.location,
        experienceYears: context.marketData.experienceYears,
        marketRange: context.marketData.marketRange,
      } : undefined,
    });

    try {
      const response = await this.llmService.chatCompletion({
        model: 'claude-sonnet-4-6',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.8,
        maxTokens: 1500
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseMessageResponse(content);
    } catch (error) {
      console.error('Failed to generate message:', error);
      return this.getDefaultMessage(messageType, isJobSeeker, context);
    }
  }

  /**
   * Check if agreement is reached
   */
  async checkAgreement(context: NegotiationContext): Promise<{
    isReached: boolean;
    agreedAmount?: number;
    agreedBenefits?: string[];
    confidence: number;
  }> {
    const prompt = getSalaryNegotiationPrompt('check_agreement', {
      room: context.room,
      messages: context.messages,
      isJobSeeker: false,
    });

    try {
      const response = await this.llmService.chatCompletion({
        model: 'claude-sonnet-4-6',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.3,
        maxTokens: 1000
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseAgreementResponse(content, context);
    } catch (error) {
      console.error('Failed to check agreement:', error);
      return { isReached: false, confidence: 0 };
    }
  }

  /**
   * Generate negotiation summary
   */
  async generateSummary(roomId: string): Promise<{
    summary: string;
    outcome: 'success' | 'partial' | 'failed';
    keyPoints: string[];
    lessonsLearned: string[];
  } | null> {
    const history = await negotiationRoomService.getHistory(roomId);
    if (!history) return null;

    const prompt = getSalaryNegotiationPrompt('summary', {
      room: history.room,
      messages: history.messages
    });

    try {
      const response = await this.llmService.chatCompletion({
        model: 'claude-sonnet-4-6',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.5,
        maxTokens: 2000
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseSummaryResponse(content);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return null;
    }
  }

  // Helper methods for parsing LLM responses

  private parseStrategyResponse(
    content: string,
    isJobSeeker: boolean,
    context: NegotiationContext
  ): NegotiationStrategy {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        return {
          approach: parsed.approach || 'collaborative',
          keyPoints: parsed.keyPoints || [],
          concessions: parsed.concessions || [],
          bottomLine: parsed.bottomLine || 0,
          targetAmount: parsed.targetAmount || 0,
          reasoning: parsed.reasoning || ''
        };
      }
    } catch (e) {
      console.error('Failed to parse strategy:', e);
    }

    return this.getDefaultStrategy(isJobSeeker, context);
  }

  private parseCounterOfferResponse(content: string, context: NegotiationContext): CounterOffer {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        return {
          amount: parsed.amount || 0,
          reasoning: parsed.reasoning || '',
          conditions: parsed.conditions,
          benefits: parsed.benefits,
          deadline: parsed.deadline ? new Date(parsed.deadline) : undefined
        };
      }
    } catch (e) {
      console.error('Failed to parse counter offer:', e);
    }

    return this.getDefaultCounterOffer(true, context);
  }

  private parseAnalysisResponse(content: string, context: NegotiationContext): NegotiationAnalysis {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        return {
          currentGap: parsed.currentGap || 0,
          percentageGap: parsed.percentageGap || 0,
          suggestedCompromise: parsed.suggestedCompromise || 0,
          winWinOpportunities: parsed.winWinOpportunities || [],
          riskAreas: parsed.riskAreas || [],
          nextMoveSuggestion: parsed.nextMoveSuggestion || ''
        };
      }
    } catch (e) {
      console.error('Failed to parse analysis:', e);
    }

    return this.getDefaultAnalysis(context);
  }

  private parseMessageResponse(content: string): {
    content: string;
    isCounterOffer: boolean;
    offerValue?: number;
    topic?: NegotiationTopic;
  } {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        return {
          content: parsed.content || parsed.message || '',
          isCounterOffer: parsed.isCounterOffer || false,
          offerValue: parsed.offerValue,
          topic: parsed.topic
        };
      }

      // If no JSON, treat entire content as message
      return {
        content: content.trim(),
        isCounterOffer: false
      };
    } catch (e) {
      return {
        content: content.trim(),
        isCounterOffer: false
      };
    }
  }

  private parseAgreementResponse(
    content: string,
    context: NegotiationContext
  ): {
    isReached: boolean;
    agreedAmount?: number;
    agreedBenefits?: string[];
    confidence: number;
  } {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        return {
          isReached: parsed.isReached || parsed.agreementReached || false,
          agreedAmount: parsed.agreedAmount,
          agreedBenefits: parsed.agreedBenefits,
          confidence: parsed.confidence || 0
        };
      }
    } catch (e) {
      console.error('Failed to parse agreement:', e);
    }

    return { isReached: false, confidence: 0 };
  }

  private parseSummaryResponse(content: string): {
    summary: string;
    outcome: 'success' | 'partial' | 'failed';
    keyPoints: string[];
    lessonsLearned: string[];
  } {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        return {
          summary: parsed.summary || '',
          outcome: parsed.outcome || 'failed',
          keyPoints: parsed.keyPoints || [],
          lessonsLearned: parsed.lessonsLearned || []
        };
      }
    } catch (e) {
      console.error('Failed to parse summary:', e);
    }

    return {
      summary: content.trim(),
      outcome: 'failed',
      keyPoints: [],
      lessonsLearned: []
    };
  }

  // Default fallback methods

  private getDefaultStrategy(
    isJobSeeker: boolean,
    context: NegotiationContext
  ): NegotiationStrategy {
    const targetRange = context.room.targetRange;
    const initialOffer = context.room.initialOffer || 0;

    if (isJobSeeker) {
      const expectedMax = context.jobSeekerProfile?.expectedMax || targetRange?.max || initialOffer * 1.2;
      return {
        approach: 'collaborative',
        keyPoints: ['Highlight relevant experience', 'Emphasize unique skills'],
        concessions: ['Flexibility on start date', 'Remote work options'],
        bottomLine: context.jobSeekerProfile?.expectedMin || initialOffer,
        targetAmount: expectedMax,
        reasoning: 'Aim for collaborative approach while maintaining bottom line'
      };
    } else {
      const budgetMax = context.employerProfile?.budgetMax || initialOffer * 1.15;
      return {
        approach: 'collaborative',
        keyPoints: ['Emphasize growth opportunities', 'Highlight company benefits'],
        concessions: ['Additional PTO', 'Professional development budget'],
        bottomLine: context.employerProfile?.budgetMin || initialOffer * 0.9,
        targetAmount: budgetMax,
        reasoning: 'Balance budget constraints with candidate expectations'
      };
    }
  }

  private getDefaultCounterOffer(
    isJobSeeker: boolean,
    context: NegotiationContext,
    lastOffer?: number
  ): CounterOffer {
    const base = lastOffer || context.room.currentOffer || context.room.initialOffer || 0;

    if (isJobSeeker) {
      return {
        amount: Math.round(base * 1.1),
        reasoning: 'Based on market research and experience level',
        conditions: ['Performance review after 6 months'],
        benefits: ['Flexible work arrangement']
      };
    } else {
      return {
        amount: Math.round(base * 0.95),
        reasoning: 'Aligned with budget and candidate experience',
        conditions: ['90-day probation period'],
        benefits: ['Comprehensive health insurance']
      };
    }
  }

  private getDefaultAnalysis(context: NegotiationContext): NegotiationAnalysis {
    const currentOffer = context.room.currentOffer || 0;
    const initialOffer = context.room.initialOffer || currentOffer;
    const gap = Math.abs(currentOffer - initialOffer);
    const percentageGap = initialOffer > 0 ? (gap / initialOffer) * 100 : 0;

    return {
      currentGap: gap,
      percentageGap,
      suggestedCompromise: Math.round((currentOffer + initialOffer) / 2),
      winWinOpportunities: ['Flexible working hours', 'Professional development'],
      riskAreas: ['Large gap between offers'],
      nextMoveSuggestion: 'Propose compromise focusing on non-monetary benefits'
    };
  }

  private getDefaultMessage(
    messageType: string,
    isJobSeeker: boolean,
    context: NegotiationContext
  ): {
    content: string;
    isCounterOffer: boolean;
    offerValue?: number;
    topic?: NegotiationTopic;
  } {
    const messages: Record<string, string> = {
      opening: isJobSeeker
        ? 'Thank you for the opportunity. I\'m excited about this role and would like to discuss the compensation package.'
        : 'We\'re impressed with your profile. Let\'s discuss the offer details.',
      counter: 'Based on my research and experience, I believe a higher compensation would be appropriate.',
      compromise: 'I\'m willing to find a middle ground that works for both of us.',
      closing: isJobSeeker
        ? 'I accept this offer. Thank you for the productive discussion.'
        : 'We\'re glad we could reach an agreement. Welcome to the team!',
      response: 'I understand your position. Let me consider this and respond.'
    };

    return {
      content: messages[messageType] || messages.response,
      isCounterOffer: messageType === 'counter'
    };
  }
}

// Export singleton instance (requires LLMService to be initialized)
let salaryNegotiationService: SalaryNegotiationService | null = null;

export function initializeSalaryNegotiationService(llmService: LLMService): void {
  salaryNegotiationService = new SalaryNegotiationService(llmService);
}

export function getSalaryNegotiationService(): SalaryNegotiationService {
  if (!salaryNegotiationService) {
    throw new Error('SalaryNegotiationService not initialized. Call initializeSalaryNegotiationService first.');
  }
  return salaryNegotiationService;
}

export { salaryNegotiationService };
