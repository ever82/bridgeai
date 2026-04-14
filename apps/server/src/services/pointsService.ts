/**
 * 积分交易服务
 * 提供余额查询、交易记录查询、积分统计等功能
 */

import { PointsTransactionType, SceneCode } from '@prisma/client';
import { prisma } from '../db/client';

export interface PointsBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdatedAt: Date;
}

export interface PointsTransaction {
  id: string;
  type: PointsTransactionType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  scene: SceneCode | null;
  referenceId: string | null;
  metadata: any;
  createdAt: Date;
}

export interface PointsStats {
  totalTransactions: number;
  totalEarned: number;
  totalSpent: number;
  byType: Record<string, { count: number; totalAmount: number }>;
}

export interface TransactionFilters {
  type?: PointsTransactionType;
  scene?: SceneCode;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class PointsService {
  /**
   * 获取用户积分余额
   */
  async getBalance(userId: string): Promise<PointsBalance> {
    const account = await prisma.pointsAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      return {
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdatedAt: new Date(),
      };
    }

    return {
      balance: account.balance,
      totalEarned: account.totalEarned,
      totalSpent: account.totalSpent,
      lastUpdatedAt: account.updatedAt,
    };
  }

  /**
   * 获取用户交易记录（支持筛选和分页）
   */
  async getTransactions(
    userId: string,
    filters: TransactionFilters = {},
    pagination: PaginationOptions = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResult<PointsTransaction>> {
    const where = this.buildTransactionWhere(userId, filters);

    const [transactions, total] = await Promise.all([
      prisma.pointsTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.pointsTransaction.count({ where }),
    ]);

    return {
      data: transactions.map(this.mapTransaction),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }

  /**
   * 获取单笔交易详情
   */
  async getTransactionDetail(
    transactionId: string,
    userId: string
  ): Promise<PointsTransaction | null> {
    const transaction = await prisma.pointsTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      return null;
    }

    return this.mapTransaction(transaction);
  }

  /**
   * 获取积分统计信息（按类型分类）
   */
  async getStats(userId: string): Promise<PointsStats> {
    const balance = await this.getBalance(userId);

    // 按类型分组统计
    const groupedStats = await prisma.pointsTransaction.groupBy({
      by: ['type'],
      where: { userId },
      _count: { id: true },
      _sum: { amount: true },
    });

    const byType: Record<string, { count: number; totalAmount: number }> = {};
    for (const stat of groupedStats) {
      byType[stat.type] = {
        count: stat._count.id,
        totalAmount: stat._sum.amount ?? 0,
      };
    }

    // 计算总收入和支出
    let totalEarned = 0;
    let totalSpent = 0;
    for (const [type, stats] of Object.entries(byType)) {
      if (type === 'EARN' || type === 'RECHARGE' || type === 'REFUND' || type === 'TRANSFER_IN') {
        totalEarned += Math.abs(stats.totalAmount);
      } else if (
        type === 'SPEND' ||
        type === 'DEDUCT' ||
        type === 'FROZEN' ||
        type === 'TRANSFER_OUT'
      ) {
        totalSpent += Math.abs(stats.totalAmount);
      }
    }

    const totalTransactions = Object.values(byType).reduce((sum, s) => sum + s.count, 0);

    return {
      totalTransactions,
      totalEarned: totalEarned || balance.totalEarned,
      totalSpent: totalSpent || balance.totalSpent,
      byType,
    };
  }

  /**
   * 导出交易记录为 CSV 格式
   */
  async exportTransactions(
    userId: string,
    filters: TransactionFilters = {}
  ): Promise<string> {
    const transactions = await prisma.pointsTransaction.findMany({
      where: this.buildTransactionWhere(userId, filters),
      orderBy: { createdAt: 'asc' },
    });

    const headers = ['ID', '类型', '金额', '交易后余额', '描述', '场景', '关联ID', '时间'];
    const rows = transactions.map(t => [
      t.id,
      t.type,
      t.amount.toString(),
      t.balanceAfter.toString(),
      t.description || '',
      t.scene || '',
      t.referenceId || '',
      t.createdAt.toISOString(),
    ]);

    const csvLines = [headers.join(',')];
    for (const row of rows) {
      csvLines.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    }

    return csvLines.join('\n');
  }

  /**
   * 构建查询条件
   */
  private buildTransactionWhere(
    userId: string,
    filters: TransactionFilters
  ): Record<string, any> {
    const where: Record<string, any> = { userId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.scene) {
      where.scene = filters.scene;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return where;
  }

  /**
   * 映射交易记录
   */
  private mapTransaction(t: any): PointsTransaction {
    return {
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      scene: t.scene,
      referenceId: t.referenceId,
      metadata: t.metadata,
      createdAt: t.createdAt,
    };
  }
}

// 导出单例
export const pointsService = new PointsService();
