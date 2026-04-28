/**
 * JWT Service
 *
 * Provides JWT token verification for Socket.io authentication.
 */
export interface JwtPayload {
    userId: string;
    email: string;
    role?: string;
    type?: string;
    iat?: number;
    exp?: number;
}
/**
 * JWT Service singleton
 */
declare class JwtService {
    private secret;
    constructor();
    /**
     * Verify a JWT token and return the decoded payload
     */
    verifyToken(token: string): Promise<JwtPayload | null>;
    /**
     * Decode a JWT token without verification (for debugging)
     */
    decodeToken(token: string): JwtPayload | null;
}
export declare const jwtService: JwtService;
export default jwtService;
//# sourceMappingURL=jwtService.d.ts.map