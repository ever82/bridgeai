/**
 * CORS Configuration
 *
 * Provides whitelist-based CORS configuration with security headers.
 */
import { CorsOptions } from 'cors';
export declare const corsConfig: CorsOptions;
export declare const securityHeaders: {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: string[];
            styleSrc: string[];
            scriptSrc: string[];
            imgSrc: string[];
            connectSrc: string[];
            fontSrc: string[];
            objectSrc: string[];
            mediaSrc: string[];
            frameSrc: string[];
            frameAncestors: string[];
            formAction: string[];
            baseUri: string[];
            upgradeInsecureRequests: never[];
        };
    };
    crossOriginEmbedderPolicy: boolean;
    crossOriginResourcePolicy: {
        policy: "cross-origin";
    };
    crossOriginOpenerPolicy: {
        policy: "same-origin";
    };
    dnsPrefetchControl: {
        allow: boolean;
    };
    frameguard: {
        action: "deny";
    };
    hidePoweredBy: boolean;
    hsts: {
        maxAge: number;
        includeSubDomains: boolean;
        preload: boolean;
    };
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: {
        permittedPolicies: "none";
    };
    referrerPolicy: {
        policy: "strict-origin-when-cross-origin";
    };
    xssFilter: boolean;
    permissionsPolicy: {
        features: {
            geolocation: string[];
            camera: string[];
            microphone: string[];
            payment: string[];
            usb: string[];
            magnetometer: string[];
            gyroscope: string[];
            accelerometer: string[];
        };
    };
};
export declare const additionalSecurityHeaders: {
    'X-Content-Type-Options': string;
    'X-Frame-Options': string;
    'X-XSS-Protection': string;
    'Cache-Control': string;
    Pragma: string;
    Expires: string;
    'Expect-CT': string;
    'X-Powered-By': string | undefined;
    Server: string | undefined;
};
export declare const requestValidation: {
    maxBodySize: string;
    maxJSONDepth: number;
    allowedContentTypes: string[];
    blockedContentTypes: string[];
    validateContentType: (contentType: string) => boolean;
};
//# sourceMappingURL=cors.d.ts.map