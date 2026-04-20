import { Router, Request, Response } from 'express';

import { EmailTrackingService } from '../../services/email/tracking/tracking.service';

export function createEmailTrackingRoutes(trackingService: EmailTrackingService): Router {
  const router = Router();

  router.get('/track/open/:messageId', async (req: Request, res: Response) => {
    const { messageId } = req.params;

    await trackingService.recordOpen(messageId);

    const trackingPixel = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
    );

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(trackingPixel);
  });

  router.get('/track/click/:messageId', async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { url } = req.query;

    if (typeof url !== 'string') {
      res.status(400).send('Missing url parameter');
      return;
    }

    await trackingService.recordClick(messageId, url);

    const redirectUrl = Buffer.from(url, 'base64').toString('utf-8');
    res.redirect(302, redirectUrl);
  });

  router.post('/webhook/bounce', async (req: Request, res: Response) => {
    const { messageId, reason } = req.body;

    if (!messageId) {
      res.status(400).json({ error: 'messageId is required' });
      return;
    }

    await trackingService.recordBounce(messageId, reason || 'Unknown bounce');
    res.json({ success: true });
  });

  router.post('/webhook/complaint', async (req: Request, res: Response) => {
    const { messageId } = req.body;

    if (!messageId) {
      res.status(400).json({ error: 'messageId is required' });
      return;
    }

    await trackingService.recordComplaint(messageId);
    res.json({ success: true });
  });

  router.get('/stats/:email', async (req: Request, res: Response) => {
    const { email } = req.params;

    const stats = await trackingService.getEmailStats(email);
    res.json(stats);
  });

  router.get('/reputation/:email', async (req: Request, res: Response) => {
    const { email } = req.params;

    const reputation = await trackingService.getReputation(email);
    if (!reputation) {
      res.json({ email, reputation: 'neutral', score: 50 });
      return;
    }
    res.json(reputation);
  });

  return router;
}