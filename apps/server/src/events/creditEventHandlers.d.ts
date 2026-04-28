/**
 * 信用分事件处理器
 * 监听各类事件，触发信用分实时更新
 */
/**
 * 用户资料更新事件
 */
export declare function handleProfileUpdate(userId: string): Promise<void>;
/**
 * 交易完成事件
 */
export declare function handleTransactionComplete(userId: string, transactionId: string): Promise<void>;
/**
 * 评价提交事件
 */
export declare function handleRatingSubmitted(userId: string, ratingId: string): Promise<void>;
/**
 * 投诉事件 (负面事件)
 */
export declare function handleComplaintReceived(userId: string, complaintId: string): Promise<void>;
/**
 * 匹配完成事件
 */
export declare function handleMatchCompleted(userId: string, matchId: string): Promise<void>;
/**
 * 消息响应事件
 */
export declare function handleMessageResponse(userId: string, messageId: string): Promise<void>;
export declare const creditEventHandlers: {
    profileUpdate: typeof handleProfileUpdate;
    transactionComplete: typeof handleTransactionComplete;
    ratingSubmitted: typeof handleRatingSubmitted;
    complaintReceived: typeof handleComplaintReceived;
    matchCompleted: typeof handleMatchCompleted;
    messageResponse: typeof handleMessageResponse;
};
export type CreditEventType = keyof typeof creditEventHandlers;
//# sourceMappingURL=creditEventHandlers.d.ts.map