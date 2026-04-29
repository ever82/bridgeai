import { ApiResponse } from '../utils/response';
/**
 * Request timeout middleware
 * Sets a timeout for requests and returns a 504 if exceeded
 */
export const timeout = (ms) => {
    return (req, res, next) => {
        // Use shorter timeout in test environment to avoid long waits
        const effectiveTimeout = process.env.NODE_ENV === 'test' ? 15000 : ms;
        // Set timeout on the request socket
        req.setTimeout(effectiveTimeout, () => {
            res.status(504).json(ApiResponse.error('Request timeout', 'REQUEST_TIMEOUT', 504));
        });
        // Set response timeout
        res.setTimeout(effectiveTimeout, () => {
            res.status(504).json(ApiResponse.error('Response timeout', 'RESPONSE_TIMEOUT', 504));
        });
        next();
    };
};
//# sourceMappingURL=timeout.js.map