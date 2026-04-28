/**
 * 用户隐私和安全设置路由
 */
import { Router } from 'express';
import { z } from 'zod';
declare const router: Router;
export declare const privacySettingsSchema: z.ZodObject<{
    profileVisibility: z.ZodOptional<z.ZodEnum<["public", "friends", "private"]>>;
    onlineStatusVisibility: z.ZodOptional<z.ZodEnum<["everyone", "friends", "nobody"]>>;
    phoneVisibility: z.ZodOptional<z.ZodEnum<["public", "friends", "hidden"]>>;
    emailVisibility: z.ZodOptional<z.ZodEnum<["public", "friends", "hidden"]>>;
    allowSearchByPhone: z.ZodOptional<z.ZodBoolean>;
    allowSearchByEmail: z.ZodOptional<z.ZodBoolean>;
    showLastSeen: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    profileVisibility?: "public" | "friends" | "private" | undefined;
    onlineStatusVisibility?: "friends" | "everyone" | "nobody" | undefined;
    phoneVisibility?: "hidden" | "public" | "friends" | undefined;
    emailVisibility?: "hidden" | "public" | "friends" | undefined;
    allowSearchByPhone?: boolean | undefined;
    allowSearchByEmail?: boolean | undefined;
    showLastSeen?: boolean | undefined;
}, {
    profileVisibility?: "public" | "friends" | "private" | undefined;
    onlineStatusVisibility?: "friends" | "everyone" | "nobody" | undefined;
    phoneVisibility?: "hidden" | "public" | "friends" | undefined;
    emailVisibility?: "hidden" | "public" | "friends" | undefined;
    allowSearchByPhone?: boolean | undefined;
    allowSearchByEmail?: boolean | undefined;
    showLastSeen?: boolean | undefined;
}>;
export default router;
//# sourceMappingURL=userPrivacy.d.ts.map