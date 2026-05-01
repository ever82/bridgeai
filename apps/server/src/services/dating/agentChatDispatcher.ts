/**
 * Agent Chat Dispatcher
 * Orchestration layer that bridges candidate generation to agent-initiated chats.
 *
 * After dating recommendations are produced, this dispatcher iterates the top
 * matches and triggers `initiateChat()` for each, ensuring the Agent autonomous
 * conversation flow is actually exercised on the production path.
 */

import type { DatingProfile } from '@bridgeai/shared';

import { logger } from '../../utils/logger';

import {
  initiateChat,
  getActiveChatsForUser,
  MaxActiveChatsError,
  MaxGlobalSessionsError,
  BehaviorRejectedError,
  type ChatSession,
} from './agentInitiatedChat';
import type { MatchScore } from './matchAlgorithm';

export interface DispatchCandidate {
  profile: Pick<DatingProfile, 'id' | 'agentId' | 'userId'>;
  matchScore: MatchScore;
}

export interface DispatchAgentChatsOptions {
  /** Source agent id (the user's own agent) */
  sourceAgentId: string;
  /** Source user id (the user owning sourceAgentId) */
  sourceUserId: string;
  /** Maximum number of matches to dispatch chats for (default: 3) */
  topN?: number;
}

export interface DispatchResult {
  dispatched: ChatSession[];
  skipped: number;
  failed: number;
}

/**
 * Check whether an active chat already exists between two users.
 */
function hasExistingChat(sourceUserId: string, targetUserId: string): boolean {
  const existing = getActiveChatsForUser(sourceUserId);
  return existing.some(
    s =>
      (s.sourceUserId === sourceUserId && s.targetUserId === targetUserId) ||
      (s.sourceUserId === targetUserId && s.targetUserId === sourceUserId)
  );
}

/**
 * Iterate the top N candidates and dispatch agent-initiated chats for each.
 *
 * Skips candidates that already have an active chat between the two users.
 * Per-candidate failures are logged but do not abort remaining dispatches.
 */
export async function dispatchAgentChatsForMatches(
  sourceUserId: string,
  candidates: DispatchCandidate[],
  options: Omit<DispatchAgentChatsOptions, 'sourceUserId'>
): Promise<DispatchResult> {
  const topN = options.topN ?? 3;
  const slice = candidates.slice(0, topN);

  const dispatched: ChatSession[] = [];
  let skipped = 0;
  let failed = 0;

  for (const candidate of slice) {
    const targetAgentId = candidate.profile.agentId;
    const targetUserId = candidate.profile.userId;

    if (!targetAgentId || !targetUserId) {
      logger.warn(
        `[agentChatDispatcher] Skipping candidate ${candidate.profile.id}: missing agentId/userId`
      );
      skipped++;
      continue;
    }

    if (hasExistingChat(sourceUserId, targetUserId)) {
      logger.info(
        `[agentChatDispatcher] Skipping candidate ${candidate.profile.id}: chat already exists between ${sourceUserId} and ${targetUserId}`
      );
      skipped++;
      continue;
    }

    try {
      const session = await initiateChat({
        matchScore: candidate.matchScore,
        sourceAgentId: options.sourceAgentId,
        targetAgentId,
        sourceUserId,
        targetUserId,
      });
      dispatched.push(session);
      logger.info(
        `[agentChatDispatcher] Dispatched chat ${session.id} for candidate ${candidate.profile.id} (score=${candidate.matchScore.totalScore})`
      );
    } catch (error) {
      // Concurrency / behavior gates: skip without counting as failure
      if (
        error instanceof MaxActiveChatsError ||
        error instanceof MaxGlobalSessionsError ||
        error instanceof BehaviorRejectedError
      ) {
        skipped++;
        logger.warn(
          `[agentChatDispatcher] Skipping candidate ${candidate.profile.id} due to ${error.name}: ${error.message}`
        );
        // Global session cap: no point trying remaining candidates
        if (error instanceof MaxGlobalSessionsError) {
          break;
        }
        continue;
      }
      failed++;
      logger.error(
        `[agentChatDispatcher] Failed to initiate chat for candidate ${candidate.profile.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  logger.info(
    `[agentChatDispatcher] Dispatch complete: dispatched=${dispatched.length}, skipped=${skipped}, failed=${failed}`
  );

  return { dispatched, skipped, failed };
}

export default {
  dispatchAgentChatsForMatches,
};
