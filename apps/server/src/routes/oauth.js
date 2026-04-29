/**
 * OAuth Routes
 * 第三方登录路由
 *
 * 微信、Google OAuth 登录回调
 */
import { Router } from 'express';
import * as oauthService from '../services/oauthService';
import { logger } from '../utils/logger';
const router = Router();
/**
 * GET /api/v1/oauth/wechat
 * 微信 OAuth 授权 URL
 */
router.get('/wechat', (req, res) => {
    try {
        const { state, redirect } = req.query;
        const authUrl = oauthService.getOAuthAuthorizationUrl('wechat', redirect || state);
        res.redirect(authUrl);
    }
    catch (error) {
        logger.error('WeChat OAuth URL generation failed', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/v1/oauth/wechat/callback
 * 微信 OAuth 回调
 */
router.get('/wechat/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code) {
            return res.status(400).json({ error: '授权码不能为空' });
        }
        const result = await oauthService.handleOAuthCallback('wechat', code);
        if (state) {
            return res.redirect(`${state}?token=${result.accessToken}`);
        }
        res.json({ success: true, data: result });
    }
    catch (error) {
        logger.error('WeChat OAuth callback failed', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/v1/oauth/google
 * Google OAuth 授权 URL
 */
router.get('/google', (req, res) => {
    try {
        const { state, redirect } = req.query;
        const authUrl = oauthService.getOAuthAuthorizationUrl('google', redirect || state);
        res.redirect(authUrl);
    }
    catch (error) {
        logger.error('Google OAuth URL generation failed', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/v1/oauth/google/callback
 * Google OAuth 回调
 */
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code) {
            return res.status(400).json({ error: '授权码不能为空' });
        }
        const result = await oauthService.handleOAuthCallback('google', code);
        if (state) {
            return res.redirect(`${state}?token=${result.accessToken}`);
        }
        res.json({ success: true, data: result });
    }
    catch (error) {
        logger.error('Google OAuth callback failed', error);
        res.status(500).json({ error: error.message });
    }
});
export default router;
//# sourceMappingURL=oauth.js.map