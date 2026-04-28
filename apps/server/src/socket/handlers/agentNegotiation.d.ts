/**
 * Agent Negotiation Socket Handlers
 * Agent优惠协商谈判Socket事件处理器
 *
 * 处理协商谈判的实时WebSocket通信
 */
import type { Namespace } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/auth';
/**
 * 注册Agent协商Socket事件处理器
 */
export declare function registerAgentNegotiationHandlers(socket: AuthenticatedSocket, nsp: Namespace): void;
declare const _default: {
    registerAgentNegotiationHandlers: typeof registerAgentNegotiationHandlers;
};
export default _default;
//# sourceMappingURL=agentNegotiation.d.ts.map