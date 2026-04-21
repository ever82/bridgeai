/**
 * TLS Enforcement Middleware
 *
 * Enforces HTTPS connections in production.
 * Redirects HTTP requests to HTTPS and sets Strict-Transport-Security headers.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Redirect HTTP to HTTPS and set HSTS headers in production
 */
export function tlsEnforcement() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only enforce in production
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    // Check if the request is already HTTPS (via x-forwarded-proto for reverse proxies)
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto === 'https') {
      // Set HSTS header (1 year, include subdomains, preload)
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
      return next();
    }

    // Redirect HTTP to HTTPS
    const host = req.headers.host;
    if (host) {
      const httpsUrl = `https://${host}${req.originalUrl}`;
      res.redirect(301, httpsUrl);
      return;
    }

    // If we can't determine the host, reject the request
    res.status(400).json({
      success: false,
      error: 'HTTPS_REQUIRED',
      message: 'Insecure HTTP connections are not accepted in production',
    });
  };
}
