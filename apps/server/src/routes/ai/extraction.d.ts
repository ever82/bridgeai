/**
 * AI Extraction Routes
 * AI需求提取API端点
 * 提供需求提取、批量提取、WebSocket实时反馈等功能
 */
import { Router } from 'express';
import { WebSocket } from 'ws';
declare const router: Router;
/**
 * WebSocket handler for real-time extraction
 * WebSocket实时提取反馈
 */
export declare function handleWebSocketConnection(ws: WebSocket, requestId: string): void;
export default router;
//# sourceMappingURL=extraction.d.ts.map