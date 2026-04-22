/**
 * OAuth Routes
 * 第三方登录路由
 *
 * 微信、Google OAuth 登录回调
 */

import { Router, Request, Response } from 'express';

import * as oauthService from '../services/oauthService';
import { logger } from '../utils/logger';

const router: Router = Router();

/**
 * GET /api/v1/oauth/wechat
 * 微信 OAuth 授权 URL
 */
router.get('/wechat', (req: Request, res: Response) => {
  try {
    const { state, redirect } = req.query;

    const authUrl = oauthService.getOAuthAuthorizationUrl(
      'wechat',
      (redirect as string) || (state as string)
    );

    res.redirect(authUrl);
  } catch (error) {
    logger.error('WeChat OAuth URL generation failed', error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/oauth/wechat/callback
 * 微信 OAuth 回调
 */
router.get('/wechat/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: '授权码不能为空' });
    }

    const result = await oauthService.handleOAuthCallback('wechat', code as string);

    if (state) {
      return res.redirect(`${state}?token=${result.accessToken}`);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('WeChat OAuth callback failed', error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/oauth/google
 * Google OAuth 授权 URL
 */
router.get('/google', (req: Request, res: Response) => {
  try {
    const { state, redirect } = req.query;

    const authUrl = oauthService.getOAuthAuthorizationUrl(
      'google',
      (redirect as string) || (state as string)
    );

    res.redirect(authUrl);
  } catch (error) {
    logger.error('Google OAuth URL generation failed', error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/oauth/google/callback
 * Google OAuth 回调
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: '授权码不能为空' });
    }

    const result = await oauthService.handleOAuthCallback('google', code as string);

    if (state) {
      return res.redirect(`${state}?token=${result.accessToken}`);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Google OAuth callback failed', error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
