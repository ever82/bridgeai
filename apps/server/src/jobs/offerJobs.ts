/**
 * Offer Scheduled Jobs
 * Handles periodic tasks for offer management
 */

import { logger } from '../utils/logger';
import * as offerService from '../services/offerService';

/**
 * Check and update expired offers
 * Should be run periodically (e.g., every hour)
 */
export async function checkExpiredOffersJob(): Promise<void> {
  try {
    logger.info('Starting expired offers check job');

    const expiredCount = await offerService.checkExpiredOffers();

    logger.info('Expired offers check completed', {
      expiredCount,
    });
  } catch (error) {
    logger.error('Expired offers check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check and activate scheduled offers
 * Should be run periodically (e.g., every minute)
 */
export async function activateScheduledOffersJob(): Promise<void> {
  try {
    logger.info('Starting scheduled offers activation job');

    const activatedCount = await offerService.activateScheduledOffers();

    if (activatedCount > 0) {
      logger.info('Scheduled offers activation completed', {
        activatedCount,
      });
    }
  } catch (error) {
    logger.error('Scheduled offers activation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check for low stock offers and send alerts
 * Should be run periodically (e.g., every 15 minutes)
 */
export async function checkLowStockOffersJob(): Promise<void> {
  try {
    logger.info('Starting low stock offers check job');

    const lowStockAlerts = await offerService.getLowStockOffers();

    if (lowStockAlerts.length > 0) {
      logger.warn('Low stock offers detected', {
        alertCount: lowStockAlerts.length,
        alerts: lowStockAlerts.map((alert) => ({
          offerId: alert.offerId,
          title: alert.title,
          remainingStock: alert.remainingStock,
        })),
      });

      // TODO: Send notifications to merchants
      // This would integrate with the notification service
      for (const alert of lowStockAlerts) {
        // await notificationService.sendStockAlert(alert);
        logger.info('Stock alert sent', {
          offerId: alert.offerId,
          merchantId: alert.merchantId,
        });
      }
    }

    logger.info('Low stock offers check completed', {
      alertCount: lowStockAlerts.length,
    });
  } catch (error) {
    logger.error('Low stock offers check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Run all offer maintenance jobs
 * Can be called from a cron job or scheduled task runner
 */
export async function runOfferMaintenanceJobs(): Promise<void> {
  logger.info('Starting offer maintenance jobs');

  await Promise.all([
    checkExpiredOffersJob(),
    activateScheduledOffersJob(),
    checkLowStockOffersJob(),
  ]);

  logger.info('Offer maintenance jobs completed');
}
