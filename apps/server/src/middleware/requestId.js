import { v4 as uuidv4 } from 'uuid';
export const requestId = (req, res, next) => {
    // Use existing request ID from header or generate new one
    const requestId = req.headers['x-request-id'] || uuidv4();
    req.requestId = requestId;
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    next();
};
//# sourceMappingURL=requestId.js.map