/**
 * Data Masking Response Middleware
 *
 * Automatically masks sensitive fields in API responses.
 * Delegates to the existing mask utility for field-level masking.
 */
import { maskObject } from '../utils/mask';
/**
 * Express middleware that intercepts JSON responses and masks sensitive fields.
 *
 * Uses the existing maskObject utility which auto-detects sensitive fields
 * based on field names and content patterns.
 */
export function dataMaskingMiddleware() {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            // Skip masking if explicitly disabled for this request
            if (req.skipDataMasking) {
                return originalJson(data);
            }
            // If the response has a `data` property (standard API envelope), mask within it
            if (data && typeof data === 'object' && 'data' in data) {
                const masked = { ...data, data: maskObject(data.data) };
                return originalJson(masked);
            }
            return originalJson(maskObject(data));
        };
        next();
    };
}
//# sourceMappingURL=dataMasking.js.map