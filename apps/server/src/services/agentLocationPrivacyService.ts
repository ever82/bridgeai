/**
 * Agent Location Privacy Service
 * Agent 位置隐私服务
 */

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

export type LocationPrivacyLevel = 'EXACT' | 'DISTRICT' | 'CITY' | 'PROVINCE' | 'HIDDEN';

export interface AgentLocationPrivacySettings {
  privacyLevel: LocationPrivacyLevel;
  showExactCoords: boolean;
  hideFromPublic: boolean;
}

/**
 * Get agent location privacy settings
 */
export async function getAgentLocationPrivacy(
  agentId: string
): Promise<AgentLocationPrivacySettings | null> {
  try {
    const privacy = await prisma.agentLocationPrivacy.findUnique({
      where: { agentId },
    });

    if (!privacy) {
      return null;
    }

    return {
      privacyLevel: (privacy.privacyLevel || 'CITY') as LocationPrivacyLevel,
      showExactCoords: privacy.showExactCoords,
      hideFromPublic: privacy.hideFromPublic,
    };
  } catch (error) {
    logger.error('Failed to get agent location privacy', { error, agentId });
    return null;
  }
}

/**
 * Create or update agent location privacy settings
 */
export async function setAgentLocationPrivacy(
  agentId: string,
  settings: Partial<AgentLocationPrivacySettings>
): Promise<boolean> {
  try {
    const data: any = {};
    if (settings.privacyLevel !== undefined) data.privacyLevel = settings.privacyLevel;
    if (settings.showExactCoords !== undefined) data.showExactCoords = settings.showExactCoords;
    if (settings.hideFromPublic !== undefined) data.hideFromPublic = settings.hideFromPublic;

    await prisma.agentLocationPrivacy.upsert({
      where: { agentId },
      create: {
        agentId,
        privacyLevel: settings.privacyLevel ?? 'CITY',
        showExactCoords: settings.showExactCoords ?? false,
        hideFromPublic: settings.hideFromPublic ?? false,
      },
      update: data,
    });

    logger.info('Agent location privacy updated', { agentId, settings });
    return true;
  } catch (error) {
    logger.error('Failed to set agent location privacy', { error, agentId, settings });
    return false;
  }
}

/**
 * Apply privacy filter to agent location data
 * Returns sanitized location data based on privacy level
 */
export async function applyPrivacyFilter(
  agentId: string,
  locationData: { location?: any; latitude?: number | null; longitude?: number | null }
): Promise<{
  location?: any;
  latitude?: number | null;
  longitude?: number | null;
  privacyApplied: boolean;
}> {
  const privacy = await getAgentLocationPrivacy(agentId);

  if (!privacy || privacy.hideFromPublic) {
    return {
      location: undefined,
      latitude: null,
      longitude: null,
      privacyApplied: true,
    };
  }

  switch (privacy.privacyLevel) {
    case 'EXACT':
      if (privacy.showExactCoords) {
        return { ...locationData, privacyApplied: false };
      }
      // Fall through to CITY level
    case 'CITY':
      // Return city-level only (remove district and precise address)
      if (locationData.location) {
        const sanitized = { ...locationData.location };
        delete sanitized.district;
        delete sanitized.districtName;
        delete sanitized.address;
        return { ...locationData, location: sanitized, privacyApplied: true };
      }
      return { latitude: null, longitude: null, privacyApplied: true };

    case 'DISTRICT':
      // Return district-level only
      if (locationData.location) {
        const sanitized = { ...locationData.location };
        delete sanitized.address;
        return { ...locationData, location: sanitized, privacyApplied: true };
      }
      return { latitude: null, longitude: null, privacyApplied: true };

    case 'PROVINCE':
      // Return province-level only
      if (locationData.location) {
        const sanitized = {
          province: locationData.location.province,
          provinceName: locationData.location.provinceName,
        };
        return { latitude: null, longitude: null, location: sanitized, privacyApplied: true };
      }
      return { latitude: null, longitude: null, privacyApplied: true };

    default:
      return { ...locationData, privacyApplied: false };
  }
}

/**
 * Delete agent location privacy settings
 */
export async function deleteAgentLocationPrivacy(agentId: string): Promise<boolean> {
  try {
    await prisma.agentLocationPrivacy.delete({ where: { agentId } });
    return true;
  } catch (error) {
    logger.error('Failed to delete agent location privacy', { error, agentId });
    return false;
  }
}
