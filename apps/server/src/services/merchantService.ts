import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import {
  Merchant,
  MerchantStatus,
  CreateMerchantInput,
  UpdateMerchantInput,
  MerchantFilterOptions,
  MerchantListResult,
} from '../types/merchant.types';
import { AgentType } from './agentService';

/**
 * Create a new merchant
 * Validates that the associated agent is of type AGENTAD
 */
export async function createMerchant(input: CreateMerchantInput): Promise<Merchant> {
  // Verify the agent exists and is of type AGENTAD
  const agent = await prisma.agent.findUnique({
    where: { id: input.agentId },
    include: { user: true },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.type !== AgentType.AGENTAD) {
    throw new AppError(
      'Merchant can only be created for AGENTAD type agents',
      'INVALID_AGENT_TYPE',
      400
    );
  }

  // Check if merchant already exists for this agent
  const existingMerchant = await prisma.merchant.findUnique({
    where: { agentId: input.agentId },
  });

  if (existingMerchant) {
    throw new AppError(
      'Merchant already exists for this agent',
      'MERCHANT_EXISTS',
      409
    );
  }

  const merchant = await prisma.merchant.create({
    data: {
      agentId: input.agentId,
      name: input.name,
      address: input.address,
      phone: input.phone,
      businessHours: input.businessHours ? JSON.stringify(input.businessHours) : null,
      description: input.description,
      logoUrl: input.logoUrl,
      category: input.category,
      status: MerchantStatus.ACTIVE,
    },
  });

  return mapPrismaMerchantToMerchant(merchant);
}

/**
 * Get merchant by ID
 */
export async function getMerchantById(id: string): Promise<Merchant> {
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      _count: {
        select: { offers: true },
      },
    },
  });

  if (!merchant) {
    throw new AppError('Merchant not found', 'MERCHANT_NOT_FOUND', 404);
  }

  return mapPrismaMerchantToMerchant(merchant);
}

/**
 * Get merchant by agent ID
 */
export async function getMerchantByAgentId(agentId: string): Promise<Merchant | null> {
  const merchant = await prisma.merchant.findUnique({
    where: { agentId },
  });

  if (!merchant) {
    return null;
  }

  return mapPrismaMerchantToMerchant(merchant);
}

/**
 * Update merchant
 */
export async function updateMerchant(
  id: string,
  input: UpdateMerchantInput
): Promise<Merchant> {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id },
  });

  if (!existingMerchant) {
    throw new AppError('Merchant not found', 'MERCHANT_NOT_FOUND', 404);
  }

  const merchant = await prisma.merchant.update({
    where: { id },
    data: {
      name: input.name,
      address: input.address,
      phone: input.phone,
      businessHours: input.businessHours ? JSON.stringify(input.businessHours) : undefined,
      description: input.description,
      logoUrl: input.logoUrl,
      category: input.category,
      status: input.status,
    },
  });

  return mapPrismaMerchantToMerchant(merchant);
}

/**
 * Delete merchant
 */
export async function deleteMerchant(id: string): Promise<void> {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      _count: {
        select: { offers: true },
      },
    },
  });

  if (!existingMerchant) {
    throw new AppError('Merchant not found', 'MERCHANT_NOT_FOUND', 404);
  }

  // Check if there are active offers
  const activeOffersCount = await prisma.offer.count({
    where: {
      merchantId: id,
      status: { in: ['ACTIVE', 'PENDING'] },
    },
  });

  if (activeOffersCount > 0) {
    throw new AppError(
      'Cannot delete merchant with active offers',
      'ACTIVE_OFFERS_EXIST',
      400
    );
  }

  await prisma.merchant.delete({
    where: { id },
  });
}

/**
 * List merchants with filtering
 */
export async function listMerchants(
  options: MerchantFilterOptions
): Promise<MerchantListResult> {
  const {
    status,
    category,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.merchant.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    merchants: merchants.map(mapPrismaMerchantToMerchant),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Update merchant status
 */
export async function updateMerchantStatus(
  id: string,
  status: MerchantStatus
): Promise<Merchant> {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id },
  });

  if (!existingMerchant) {
    throw new AppError('Merchant not found', 'MERCHANT_NOT_FOUND', 404);
  }

  const merchant = await prisma.merchant.update({
    where: { id },
    data: { status },
  });

  return mapPrismaMerchantToMerchant(merchant);
}

/**
 * Map Prisma merchant to Merchant type
 */
function mapPrismaMerchantToMerchant(prismaMerchant: any): Merchant {
  return {
    id: prismaMerchant.id,
    agentId: prismaMerchant.agentId,
    name: prismaMerchant.name,
    address: prismaMerchant.address || undefined,
    phone: prismaMerchant.phone || undefined,
    businessHours: prismaMerchant.businessHours
      ? JSON.parse(prismaMerchant.businessHours)
      : undefined,
    description: prismaMerchant.description || undefined,
    logoUrl: prismaMerchant.logoUrl || undefined,
    category: prismaMerchant.category || undefined,
    status: prismaMerchant.status as MerchantStatus,
    createdAt: prismaMerchant.createdAt,
    updatedAt: prismaMerchant.updatedAt,
  };
}

/**
 * Get merchant statistics
 */
export async function getMerchantStats(merchantId: string): Promise<{
  totalOffers: number;
  activeOffers: number;
  totalUsageCount: number;
  lowStockOffers: number;
}> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      offers: true,
    },
  });

  if (!merchant) {
    throw new AppError('Merchant not found', 'MERCHANT_NOT_FOUND', 404);
  }

  const offers = merchant.offers || [];

  return {
    totalOffers: offers.length,
    activeOffers: offers.filter((o: any) => o.status === 'ACTIVE').length,
    totalUsageCount: offers.reduce((sum: number, o: any) => sum + (o.usageCount || 0), 0),
    lowStockOffers: offers.filter(
      (o: any) => o.remainingStock <= o.stockAlertThreshold && o.remainingStock > 0
    ).length,
  };
}
