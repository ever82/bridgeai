/**
 * Agent Persona Service
 *
 * Persists agent persona snapshots for cross-session consistency and
 * provides drift detection between current persona traits and the most
 * recent persisted snapshot.
 *
 * Storage: AgentPersonaSnapshot Prisma model.
 *
 * Backed by dynamic typing on the prisma client because the model may
 * not be present until `prisma generate` is run as part of migration.
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

/**
 * Personality fingerprint structure persisted as JSON.
 * Free-form to allow extension (scene rules, communication style, etc.).
 */
export interface PersonalityFingerprint {
  traits?: string[];
  communicationStyle?: string;
  sceneRules?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgentPersonaSnapshotRecord {
  id: string;
  agentId: string;
  personalityFingerprint: PersonalityFingerprint;
  sceneCode: string | null;
  createdAt: Date;
}

/** Drift detection result */
export interface DriftResult {
  hasDrift: boolean;
  divergence: string[];
}

interface PersonaSnapshotClient {
  create: (args: { data: Record<string, unknown> }) => Promise<AgentPersonaSnapshotRecord>;
  findFirst: (args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }) => Promise<AgentPersonaSnapshotRecord | null>;
}

function getClient(): PersonaSnapshotClient | null {
  // Dynamic access: model may not exist on the generated prisma client
  // until migration runs. Avoid hard compile-time dependency.
  const client = (prisma as unknown as { agentPersonaSnapshot?: PersonaSnapshotClient })
    .agentPersonaSnapshot;
  if (!client) {
    logger.warn('[AgentPersonaService] agentPersonaSnapshot model not available on prisma client');
    return null;
  }
  return client;
}

/**
 * Persist a persona snapshot for the given agent. Failure is non-fatal —
 * we never block message flow on snapshot persistence.
 */
export async function persistPersona(
  agentId: string,
  fingerprint: PersonalityFingerprint,
  sceneCode?: string
): Promise<AgentPersonaSnapshotRecord | null> {
  try {
    const client = getClient();
    if (!client) return null;

    const record = await client.create({
      data: {
        agentId,
        personalityFingerprint: fingerprint as unknown as Record<string, unknown>,
        sceneCode: sceneCode ?? null,
      },
    });

    logger.info('[AgentPersonaService] persona snapshot persisted', {
      agentId,
      snapshotId: record.id,
      sceneCode: sceneCode ?? null,
    });
    return record;
  } catch (error) {
    logger.error('[AgentPersonaService] failed to persist persona snapshot', {
      agentId,
      error: (error as Error)?.message,
    });
    return null;
  }
}

/**
 * Fetch the most recent persona snapshot for the given agent.
 */
export async function getLatestPersona(
  agentId: string
): Promise<AgentPersonaSnapshotRecord | null> {
  try {
    const client = getClient();
    if (!client) return null;

    return await client.findFirst({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    logger.error('[AgentPersonaService] failed to read latest persona snapshot', {
      agentId,
      error: (error as Error)?.message,
    });
    return null;
  }
}

/**
 * Detect persona drift by comparing current traits / communication style
 * against the most recent persisted snapshot.
 *
 * Returns a list of trait keys that differ (set diff in either direction)
 * plus a flag for any communication-style change.
 */
export async function detectDrift(
  agentId: string,
  _currentMessage: string,
  currentTraits: PersonalityFingerprint
): Promise<DriftResult> {
  const latest = await getLatestPersona(agentId);
  if (!latest) {
    return { hasDrift: false, divergence: [] };
  }

  const oldFp = (latest.personalityFingerprint || {}) as PersonalityFingerprint;
  const oldTraits = new Set((oldFp.traits || []).map(t => String(t).toLowerCase()));
  const newTraits = new Set((currentTraits.traits || []).map(t => String(t).toLowerCase()));

  const divergence: string[] = [];

  // anything in old not in new
  for (const t of oldTraits) {
    if (!newTraits.has(t)) divergence.push(`-${t}`);
  }
  // anything in new not in old
  for (const t of newTraits) {
    if (!oldTraits.has(t)) divergence.push(`+${t}`);
  }

  if (
    oldFp.communicationStyle &&
    currentTraits.communicationStyle &&
    oldFp.communicationStyle !== currentTraits.communicationStyle
  ) {
    divergence.push(
      `communicationStyle:${oldFp.communicationStyle}->${currentTraits.communicationStyle}`
    );
  }

  // Threshold: any divergent trait counts as drift.
  const hasDrift = divergence.length > 0;

  if (hasDrift) {
    logger.warn('[AgentPersonaService] persona drift detected', {
      agentId,
      divergence,
      latestSnapshotId: latest.id,
    });
  }

  return { hasDrift, divergence };
}

/**
 * Learn scene rules: persist a snapshot tagged with a scene code, merging
 * the rule summary into the personality fingerprint's sceneRules map.
 *
 * Caller passes a free-form ruleSummary which is stored as
 * `sceneRules[sceneCode] = ruleSummary` on top of the latest fingerprint.
 */
export async function learnSceneRules(
  agentId: string,
  sceneCode: string,
  ruleSummary: Record<string, unknown> | string
): Promise<AgentPersonaSnapshotRecord | null> {
  const latest = await getLatestPersona(agentId);
  const baseFp: PersonalityFingerprint = latest
    ? ((latest.personalityFingerprint || {}) as PersonalityFingerprint)
    : {};

  const sceneRules: Record<string, unknown> = {
    ...((baseFp.sceneRules as Record<string, unknown>) || {}),
    [sceneCode]: ruleSummary,
  };

  const merged: PersonalityFingerprint = {
    ...baseFp,
    sceneRules,
  };

  return persistPersona(agentId, merged, sceneCode);
}
