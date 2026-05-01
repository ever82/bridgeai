/**
 * Private Advice Service (AS-008 hook)
 *
 * Pushes私聊建议 (private advice) to a single user's private socket room
 * via the `agent:private_advice` channel. Only the owning user receives
 * the advice — the other party's Agent never sees it.
 *
 * Channel: `agent:private_advice`
 * Room: `user:{ownerId}` (joined in socket auth middleware)
 */

import type { Server as SocketServer } from 'socket.io';

import { logger } from '../../utils/logger';

import type { ChatSession, ChatMessage } from './agentInitiatedChat';

// ============================================
// 类型定义
// ============================================

export type PrivateAdviceType =
  | 'topic_suggestion' // 话题推荐
  | 'risk_warning' // 风险提示
  | 'intent_analysis' // 意图分析
  | 'one_tap_action'; // 一键采纳

export interface PrivateAdvice {
  chatSessionId: string;
  type: PrivateAdviceType;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// Socket.io 实例 (setter pattern)
// ============================================

let ioRef: SocketServer | null = null;

/**
 * 由 socket 初始化时注入 io 实例。在测试或非 socket 环境下可不调用。
 */
export function setSocketIO(io: SocketServer): void {
  ioRef = io;
}

/**
 * 获取已注入的 io 实例（懒加载，未注入则返回 null）。
 */
function resolveIO(): SocketServer | null {
  if (ioRef) return ioRef;
  // Lazy fallback: try to grab the global socket server if available.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const mod = require('../../socket/index');
    if (mod && typeof mod.getSocketServer === 'function') {
      const io = mod.getSocketServer();
      if (io) {
        ioRef = io;
        return io;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// ============================================
// 核心 emit
// ============================================

/**
 * 向指定 owner 的私聊房间推送私聊建议。
 * 仅会发送到 `user:{ownerId}` 房间，其他用户/Agent 看不到。
 */
export function emitPrivateAdvice(
  io: SocketServer | null | undefined,
  ownerId: string,
  advice: PrivateAdvice
): void {
  const target = io ?? resolveIO();
  if (!target) {
    logger.warn('emitPrivateAdvice skipped: socket.io not initialized', {
      ownerId,
      type: advice.type,
    });
    return;
  }

  const room = `user:${ownerId}`;
  // Emit across all namespaces — auth middleware joins user:{id} on every namespace.
  for (const nsp of (target as any)._nsps?.values?.() ?? []) {
    nsp.to(room).emit('agent:private_advice', advice);
  }

  logger.info('Emitted agent:private_advice', {
    ownerId,
    chatSessionId: advice.chatSessionId,
    type: advice.type,
  });
}

// ============================================
// 建议生成 (AS-008 启发式 stub — 后续可替换为 LLM 分析)
// ============================================

/**
 * 基于对话状态生成单条私聊建议。
 *
 * 当前为简单启发式：
 * - 若最后一条消息以问号结尾，返回 topic_suggestion
 * - 若消息中含潜在风险关键词，返回 risk_warning
 * - 否则返回 intent_analysis
 */
export function generateAdviceFromConversation(
  session: Pick<ChatSession, 'id' | 'messages' | 'matchScore'>,
  ownerAgentId?: string
): PrivateAdvice | null {
  const messages = session.messages ?? [];
  if (messages.length === 0) return null;

  const last: ChatMessage | undefined = messages[messages.length - 1];
  if (!last) return null;

  const trimmed = (last.content ?? '').trim();
  const now = new Date();

  // 风险提示：粗糙关键词扫描
  const RISK_KEYWORDS = ['转账', '借钱', '加微信', '加QQ', '银行卡', '验证码'];
  if (RISK_KEYWORDS.some(k => trimmed.includes(k))) {
    return {
      chatSessionId: session.id,
      type: 'risk_warning',
      content: `检测到对话中出现敏感词，请保持警惕，避免涉及金钱或私人账号信息。`,
      metadata: {
        triggeredBy: last.id,
        senderAgentId: last.senderAgentId,
        ownerAgentId,
      },
      createdAt: now,
    };
  }

  // 话题推荐：问句触发
  if (/[?？]\s*$/.test(trimmed)) {
    const highlight = session.matchScore?.highlights?.[0];
    return {
      chatSessionId: session.id,
      type: 'topic_suggestion',
      content: highlight
        ? `对方在询问，建议从你们的共同点「${highlight}」展开回答。`
        : `对方在询问，可以分享一段最近的真实经历来回应。`,
      metadata: {
        triggeredBy: last.id,
        ownerAgentId,
      },
      createdAt: now,
    };
  }

  // 默认：意图分析
  return {
    chatSessionId: session.id,
    type: 'intent_analysis',
    content: `对方似乎在分享个人信息，是建立信任的好时机，可以同样分享一些自己的故事。`,
    metadata: {
      triggeredBy: last.id,
      ownerAgentId,
      messageCount: messages.length,
    },
    createdAt: now,
  };
}

export default {
  setSocketIO,
  emitPrivateAdvice,
  generateAdviceFromConversation,
};
