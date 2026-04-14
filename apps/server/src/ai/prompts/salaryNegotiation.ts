/**
 * Salary Negotiation Prompts
 * AI薪资协商提示词
 */

import {
  NegotiationRoom,
  NegotiationMessage,
  NegotiationTopic,
  NegotiationStatus
} from '../../models/NegotiationRoom';

export interface PromptContext {
  room: NegotiationRoom;
  messages?: NegotiationMessage[];
  isJobSeeker?: boolean;
  messageType?: string;
  lastOffer?: number;
  marketData?: {
    position: string;
    location: string;
    experienceYears: number;
    marketRange: {
      min: number;
      max: number;
      median: number;
    };
  };
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
    flexibilityScore: number;
  };
}

export interface NegotiationPrompt {
  system: string;
  user: string;
}

/**
 * Get prompt for strategy generation
 */
export function getStrategyPrompt(context: PromptContext): NegotiationPrompt {
  const { room, isJobSeeker, marketData, jobSeekerProfile, employerProfile } = context;

  const systemPrompt = `You are an expert salary negotiation strategist AI. Your role is to help ${isJobSeeker ? 'a job seeker' : 'an employer'} develop an effective negotiation strategy.

Key principles:
- Be data-driven and consider market conditions
- Focus on win-win outcomes
- Maintain professionalism and respect
- Consider both monetary and non-monetary factors
- Account for BATNA (Best Alternative To Negotiated Agreement)

Respond in JSON format with the following structure:
{
  "approach": "collaborative|competitive|compromising|accommodating",
  "keyPoints": ["point1", "point2", ...],
  "concessions": ["concession1", "concession2", ...],
  "bottomLine": number,
  "targetAmount": number,
  "reasoning": "explanation of strategy"
}`;

  const userPrompt = `Generate a negotiation strategy for the following situation:

${isJobSeeker ? 'Job Seeker' : 'Employer'} Perspective
Current Round: ${room.currentRound}/${room.maxRounds}
Initial Offer: ${room.initialOffer} ${room.currency}
Current Offer: ${room.currentOffer} ${room.currency}
Target Range: ${room.targetRange ? `${room.targetRange.min}-${room.targetRange.max}` : 'Not specified'} ${room.currency}
Topics: ${room.topics.join(', ')}

${marketData ? `
Market Data:
- Position: ${marketData.position}
- Location: ${marketData.location}
- Experience: ${marketData.experienceYears} years
- Market Range: ${marketData.marketRange.min}-${marketData.marketRange.max} (median: ${marketData.marketRange.median})
` : ''}

${isJobSeeker && jobSeekerProfile ? `
Job Seeker Profile:
- Current Salary: ${jobSeekerProfile.currentSalary || 'Not disclosed'}
- Expected Range: ${jobSeekerProfile.expectedMin || '?'} - ${jobSeekerProfile.expectedMax || '?'}
- Priorities: ${jobSeekerProfile.priorityTopics.join(', ')}
` : ''}

${!isJobSeeker && employerProfile ? `
Employer Profile:
- Budget Range: ${employerProfile.budgetMin || '?'} - ${employerProfile.budgetMax || '?'}
- Flexibility Score: ${employerProfile.flexibilityScore}/100
- Priorities: ${employerProfile.priorityTopics.join(', ')}
` : ''}

Provide a strategic approach that maximizes value while maintaining positive relationships.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Get prompt for counter offer generation
 */
export function getCounterOfferPrompt(context: PromptContext): NegotiationPrompt {
  const { room, isJobSeeker, lastOffer, marketData } = context;

  const systemPrompt = `You are an expert salary negotiation AI. Generate a counter offer that is:
- Justified with clear reasoning
- Backed by market data and facts
- Professional and respectful
- Positioned to move toward agreement

Respond in JSON format:
{
  "amount": number,
  "reasoning": "explanation",
  "conditions": ["condition1", "condition2"],
  "benefits": ["benefit1", "benefit2"],
  "deadline": "optional ISO date string"
}`;

  const userPrompt = `Generate a counter offer for:

Perspective: ${isJobSeeker ? 'Job Seeker' : 'Employer'}
Current Round: ${room.currentRound}/${room.maxRounds}
Last Offer: ${lastOffer || room.currentOffer} ${room.currency}
Initial Offer: ${room.initialOffer} ${room.currency}

${marketData ? `
Market Reference:
- Position: ${marketData.position}
- Market Range: ${marketData.marketRange.min}-${marketData.marketRange.max} ${room.currency}
- Median: ${marketData.marketRange.median} ${room.currency}
` : ''}

${isJobSeeker
  ? 'As the job seeker, propose a counter offer that reflects your value and market conditions.'
  : 'As the employer, propose a counter offer that balances budget constraints with candidate expectations.'}`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Get prompt for negotiation analysis
 */
export function getAnalysisPrompt(context: PromptContext): NegotiationPrompt {
  const { room, messages } = context;

  const systemPrompt = `You are an expert negotiation analyst. Analyze the negotiation situation and provide insights.

Respond in JSON format:
{
  "currentGap": number,
  "percentageGap": number,
  "suggestedCompromise": number,
  "winWinOpportunities": ["opportunity1", "opportunity2"],
  "riskAreas": ["risk1", "risk2"],
  "nextMoveSuggestion": "specific actionable suggestion"
}`;

  const messageHistory = messages
    ? messages.map(m => `[${m.sender}]: ${m.content}`).join('\n')
    : 'No messages yet';

  const userPrompt = `Analyze this negotiation:

Room Status: ${room.status}
Round: ${room.currentRound}/${room.maxRounds}
Initial Offer: ${room.initialOffer} ${room.currency}
Current Offer: ${room.currentOffer} ${room.currency}
Agreed Amount: ${room.agreedAmount || 'N/A'}

Message History:
${messageHistory}

Provide strategic analysis and recommendations.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Get prompt for message generation
 */
export function getMessagePrompt(context: PromptContext): NegotiationPrompt {
  const { room, isJobSeeker, messageType, messages } = context;

  const systemPrompt = `You are a professional salary negotiation AI assistant. Generate a natural, professional message for a negotiation.

The message should be:
- Professional and respectful
- Clear and concise
- Appropriate for the negotiation stage
- Balanced and fair

Respond in JSON format:
{
  "content": "the message text",
  "isCounterOffer": boolean,
  "offerValue": number (optional),
  "topic": "salary|bonus|work_hours|remote_work|benefits|stock_options|vacation|other"
}`;

  const messageHistory = messages
    ? messages.slice(-5).map(m => `[${m.sender}]: ${m.content}`).join('\n')
    : 'No previous messages';

  const typeDescriptions: Record<string, string> = {
    opening: 'opening message to start the negotiation',
    counter: 'counter offer message',
    compromise: 'message suggesting a compromise',
    closing: 'closing/acceptance message',
    response: 'response to the other party'
  };

  const userPrompt = `Generate a ${typeDescriptions[messageType || 'response']} for:

Perspective: ${isJobSeeker ? 'Job Seeker' : 'Employer'}
Message Type: ${messageType}
Round: ${room.currentRound}/${room.maxRounds}
Current Offer: ${room.currentOffer} ${room.currency}
Topics: ${room.topics.join(', ')}

Recent Messages:
${messageHistory}

Generate an appropriate message that advances the negotiation.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Get prompt for agreement check
 */
export function getAgreementCheckPrompt(context: PromptContext): NegotiationPrompt {
  const { room, messages } = context;

  const systemPrompt = `You are an expert negotiation analyst. Determine if the negotiation has reached an agreement.

Respond in JSON format:
{
  "isReached": boolean,
  "agreedAmount": number (optional),
  "agreedBenefits": ["benefit1", "benefit2"] (optional),
  "confidence": number (0-1)
}`;

  const messageHistory = messages
    ? messages.slice(-10).map(m => `[${m.sender}]: ${m.content}`).join('\n')
    : 'No messages';

  const userPrompt = `Check if agreement has been reached:

Room Status: ${room.status}
Current Offer: ${room.currentOffer} ${room.currency}

Recent Messages:
${messageHistory}

Analyze if both parties have agreed to terms. Look for explicit acceptance or clear agreement signals.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Get prompt for negotiation summary
 */
export function getSummaryPrompt(context: PromptContext): NegotiationPrompt {
  const { room, messages } = context;

  const systemPrompt = `You are an expert negotiation analyst. Summarize the negotiation and extract key insights.

Respond in JSON format:
{
  "summary": "brief summary of the negotiation",
  "outcome": "success|partial|failed",
  "keyPoints": ["point1", "point2", ...],
  "lessonsLearned": ["lesson1", "lesson2", ...]
}`;

  const messageHistory = messages
    ? messages.map(m => `[Round ${m.round}] [${m.sender}]: ${m.content}`).join('\n')
    : 'No messages';

  const userPrompt = `Summarize this completed negotiation:

Final Status: ${room.status}
Agreed Amount: ${room.agreedAmount || 'N/A'} ${room.currency}
Rounds Completed: ${room.currentRound}/${room.maxRounds}
Topics Discussed: ${room.topics.join(', ')}

Full Conversation:
${messageHistory}

Provide a comprehensive summary including outcome, key points, and lessons learned.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Main prompt dispatcher
 */
export function getSalaryNegotiationPrompt(
  type: 'strategy' | 'counter_offer' | 'analysis' | 'message' | 'check_agreement' | 'summary',
  context: PromptContext
): NegotiationPrompt {
  switch (type) {
    case 'strategy':
      return getStrategyPrompt(context);
    case 'counter_offer':
      return getCounterOfferPrompt(context);
    case 'analysis':
      return getAnalysisPrompt(context);
    case 'message':
      return getMessagePrompt(context);
    case 'check_agreement':
      return getAgreementCheckPrompt(context);
    case 'summary':
      return getSummaryPrompt(context);
    default:
      return getMessagePrompt(context);
  }
}

export default getSalaryNegotiationPrompt;
