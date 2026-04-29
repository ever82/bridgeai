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
    profileVisibility?: "public" | "friends" | "private";
    onlineStatusVisibility?: "friends" | "everyone" | "nobody";
    phoneVisibility?: "public" | "friends" | "hidden";
    emailVisibility?: "public" | "friends" | "hidden";
    allowSearchByPhone?: boolean;
    allowSearchByEmail?: boolean;
    showLastSeen?: boolean;
}, {
    profileVisibility?: "public" | "friends" | "private";
    onlineStatusVisibility?: "friends" | "everyone" | "nobody";
    phoneVisibility?: "public" | "friends" | "hidden";
    emailVisibility?: "public" | "friends" | "hidden";
    allowSearchByPhone?: boolean;
    allowSearchByEmail?: boolean;
    showLastSeen?: boolean;
}>;
export default router;
//# sourceMappingURL=userPrivacy.d.ts.map