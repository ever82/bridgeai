/**
 * Employer Schemas
 *
 * Zod schemas for employer profile validation
 */
import { z } from 'zod';
export declare const companySizeSchema: z.ZodEnum<["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]>;
export declare const companyIndustrySchema: z.ZodEnum<["TECH", "FINANCE", "HEALTHCARE", "EDUCATION", "MANUFACTURING", "RETAIL", "CONSULTING", "MEDIA", "REAL_ESTATE", "OTHER"]>;
export declare const verificationStatusSchema: z.ZodEnum<["UNVERIFIED", "PENDING", "EMAIL_VERIFIED", "BUSINESS_VERIFIED", "REJECTED"]>;
export declare const workModeSchema: z.ZodEnum<["REMOTE", "ONSITE", "HYBRID"]>;
export declare const companyNameSchema: z.ZodString;
export declare const companyWebsiteSchema: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
export declare const companyAddressSchema: z.ZodString;
export declare const companyDescriptionSchema: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
export declare const recruiterNameSchema: z.ZodString;
export declare const recruiterTitleSchema: z.ZodString;
export declare const recruiterEmailSchema: z.ZodString;
export declare const recruiterPhoneSchema: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
export declare const companyInfoSchema: z.ZodObject<{
    name: z.ZodString;
    size: z.ZodEnum<["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]>;
    industry: z.ZodEnum<["TECH", "FINANCE", "HEALTHCARE", "EDUCATION", "MANUFACTURING", "RETAIL", "CONSULTING", "MEDIA", "REAL_ESTATE", "OTHER"]>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    address: z.ZodString;
    city: z.ZodString;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    logoUrl: z.ZodOptional<z.ZodString>;
    coverImageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    city: string;
    address: string;
    name: string;
    industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
    size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
    description?: string | undefined;
    website?: string | undefined;
    logoUrl?: string | undefined;
    coverImageUrl?: string | undefined;
}, {
    city: string;
    address: string;
    name: string;
    industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
    size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
    description?: string | undefined;
    website?: string | undefined;
    logoUrl?: string | undefined;
    coverImageUrl?: string | undefined;
}>;
export declare const recruiterInfoSchema: z.ZodObject<{
    name: z.ZodString;
    title: z.ZodString;
    email: z.ZodString;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    avatarUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    name: string;
    email: string;
    phone?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    title: string;
    name: string;
    email: string;
    phone?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export declare const companyBrandingSchema: z.ZodObject<{
    primaryColor: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
    coverImageUrl: z.ZodOptional<z.ZodString>;
    companyPhotos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    videoUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    logoUrl?: string | undefined;
    primaryColor?: string | undefined;
    coverImageUrl?: string | undefined;
    companyPhotos?: string[] | undefined;
    videoUrl?: string | undefined;
}, {
    logoUrl?: string | undefined;
    primaryColor?: string | undefined;
    coverImageUrl?: string | undefined;
    companyPhotos?: string[] | undefined;
    videoUrl?: string | undefined;
}>;
export declare const companyVerificationSchema: z.ZodObject<{
    status: z.ZodEnum<["UNVERIFIED", "PENDING", "EMAIL_VERIFIED", "BUSINESS_VERIFIED", "REJECTED"]>;
    emailVerifiedAt: z.ZodOptional<z.ZodString>;
    businessLicenseUrl: z.ZodOptional<z.ZodString>;
    businessLicenseVerifiedAt: z.ZodOptional<z.ZodString>;
    rejectedReason: z.ZodOptional<z.ZodString>;
    submittedAt: z.ZodOptional<z.ZodString>;
    reviewedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "REJECTED" | "UNVERIFIED" | "EMAIL_VERIFIED" | "BUSINESS_VERIFIED";
    businessLicenseUrl?: string | undefined;
    emailVerifiedAt?: string | undefined;
    businessLicenseVerifiedAt?: string | undefined;
    rejectedReason?: string | undefined;
    submittedAt?: string | undefined;
    reviewedAt?: string | undefined;
}, {
    status: "PENDING" | "REJECTED" | "UNVERIFIED" | "EMAIL_VERIFIED" | "BUSINESS_VERIFIED";
    businessLicenseUrl?: string | undefined;
    emailVerifiedAt?: string | undefined;
    businessLicenseVerifiedAt?: string | undefined;
    rejectedReason?: string | undefined;
    submittedAt?: string | undefined;
    reviewedAt?: string | undefined;
}>;
export declare const createEmployerProfileSchema: z.ZodObject<{
    companyInfo: z.ZodObject<{
        name: z.ZodString;
        size: z.ZodEnum<["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]>;
        industry: z.ZodEnum<["TECH", "FINANCE", "HEALTHCARE", "EDUCATION", "MANUFACTURING", "RETAIL", "CONSULTING", "MEDIA", "REAL_ESTATE", "OTHER"]>;
        website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        address: z.ZodString;
        city: z.ZodString;
        description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        address: string;
        name: string;
        industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
        size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
        description?: string | undefined;
        website?: string | undefined;
    }, {
        city: string;
        address: string;
        name: string;
        industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
        size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
        description?: string | undefined;
        website?: string | undefined;
    }>;
    recruiterInfo: z.ZodObject<{
        name: z.ZodString;
        title: z.ZodString;
        email: z.ZodString;
        phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        name: string;
        email: string;
        phone?: string | undefined;
    }, {
        title: string;
        name: string;
        email: string;
        phone?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    companyInfo: {
        city: string;
        address: string;
        name: string;
        industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
        size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
        description?: string | undefined;
        website?: string | undefined;
    };
    recruiterInfo: {
        title: string;
        name: string;
        email: string;
        phone?: string | undefined;
    };
}, {
    companyInfo: {
        city: string;
        address: string;
        name: string;
        industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
        size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
        description?: string | undefined;
        website?: string | undefined;
    };
    recruiterInfo: {
        title: string;
        name: string;
        email: string;
        phone?: string | undefined;
    };
}>;
export declare const updateEmployerProfileSchema: z.ZodObject<{
    companyInfo: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodEnum<["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]>>;
        industry: z.ZodOptional<z.ZodEnum<["TECH", "FINANCE", "HEALTHCARE", "EDUCATION", "MANUFACTURING", "RETAIL", "CONSULTING", "MEDIA", "REAL_ESTATE", "OTHER"]>>;
        website: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
        address: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
        logoUrl: z.ZodOptional<z.ZodString>;
        coverImageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        city?: string | undefined;
        address?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        website?: string | undefined;
        industry?: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE" | undefined;
        logoUrl?: string | undefined;
        size?: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE" | undefined;
        coverImageUrl?: string | undefined;
    }, {
        city?: string | undefined;
        address?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        website?: string | undefined;
        industry?: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE" | undefined;
        logoUrl?: string | undefined;
        size?: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE" | undefined;
        coverImageUrl?: string | undefined;
    }>>;
    recruiterInfo: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title?: string | undefined;
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    }, {
        title?: string | undefined;
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    }>>;
    branding: z.ZodOptional<z.ZodObject<{
        primaryColor: z.ZodOptional<z.ZodString>;
        logoUrl: z.ZodOptional<z.ZodString>;
        coverImageUrl: z.ZodOptional<z.ZodString>;
        companyPhotos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        videoUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        logoUrl?: string | undefined;
        primaryColor?: string | undefined;
        coverImageUrl?: string | undefined;
        companyPhotos?: string[] | undefined;
        videoUrl?: string | undefined;
    }, {
        logoUrl?: string | undefined;
        primaryColor?: string | undefined;
        coverImageUrl?: string | undefined;
        companyPhotos?: string[] | undefined;
        videoUrl?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    companyInfo?: {
        city?: string | undefined;
        address?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        website?: string | undefined;
        industry?: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE" | undefined;
        logoUrl?: string | undefined;
        size?: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE" | undefined;
        coverImageUrl?: string | undefined;
    } | undefined;
    recruiterInfo?: {
        title?: string | undefined;
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    } | undefined;
    branding?: {
        logoUrl?: string | undefined;
        primaryColor?: string | undefined;
        coverImageUrl?: string | undefined;
        companyPhotos?: string[] | undefined;
        videoUrl?: string | undefined;
    } | undefined;
}, {
    companyInfo?: {
        city?: string | undefined;
        address?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        website?: string | undefined;
        industry?: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE" | undefined;
        logoUrl?: string | undefined;
        size?: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE" | undefined;
        coverImageUrl?: string | undefined;
    } | undefined;
    recruiterInfo?: {
        title?: string | undefined;
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    } | undefined;
    branding?: {
        logoUrl?: string | undefined;
        primaryColor?: string | undefined;
        coverImageUrl?: string | undefined;
        companyPhotos?: string[] | undefined;
        videoUrl?: string | undefined;
    } | undefined;
}>;
export declare const updateEmployerBrandingSchema: z.ZodObject<{
    primaryColor: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
    coverImageUrl: z.ZodOptional<z.ZodString>;
    companyPhotos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    videoUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    logoUrl?: string | undefined;
    primaryColor?: string | undefined;
    coverImageUrl?: string | undefined;
    companyPhotos?: string[] | undefined;
    videoUrl?: string | undefined;
}, {
    logoUrl?: string | undefined;
    primaryColor?: string | undefined;
    coverImageUrl?: string | undefined;
    companyPhotos?: string[] | undefined;
    videoUrl?: string | undefined;
}>;
export declare const companyVerificationRequestSchema: z.ZodObject<{
    businessLicenseUrl: z.ZodString;
    businessRegistrationNumber: z.ZodString;
}, "strip", z.ZodTypeAny, {
    businessLicenseUrl: string;
    businessRegistrationNumber: string;
}, {
    businessLicenseUrl: string;
    businessRegistrationNumber: string;
}>;
export declare const verifyEmailSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const employerProfileResponseSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    agentId: z.ZodString;
    companyInfo: z.ZodObject<{
        name: z.ZodString;
        size: z.ZodEnum<["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]>;
        industry: z.ZodEnum<["TECH", "FINANCE", "HEALTHCARE", "EDUCATION", "MANUFACTURING", "RETAIL", "CONSULTING", "MEDIA", "REAL_ESTATE", "OTHER"]>;
        website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        address: z.ZodString;
        city: z.ZodString;
        description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        logoUrl: z.ZodOptional<z.ZodString>;
        coverImageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        address: string;
        name: string;
        industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
        size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
        description?: string | undefined;
        website?: string | undefined;
        logoUrl?: string | undefined;
        coverImageUrl?: string | undefined;
    }, {
        city: string;
        address: string;
        name: string;
        industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
        size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
        description?: string | undefined;
        website?: string | undefined;
        logoUrl?: string | undefined;
        coverImageUrl?: string | undefined;
    }>;
    recruiterInfo: z.ZodObject<{
        name: z.ZodString;
        title: z.ZodString;
        email: z.ZodString;
        phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        name: string;
        email: string;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    }, {
        title: string;
        name: string;
        email: string;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    }>;
    verification: z.ZodObject<{
        status: z.ZodEnum<["UNVERIFIED", "PENDING", "EMAIL_VERIFIED", "BUSINESS_VERIFIED", "REJECTED"]>;
        emailVerifiedAt: z.ZodOptional<z.ZodString>;
        businessLicenseUrl: z.ZodOptional<z.ZodString>;
        businessLicenseVerifiedAt: z.ZodOptional<z.ZodString>;
        rejectedReason: z.ZodOptional<z.ZodString>;
        submittedAt: z.ZodOptional<z.ZodString>;
        reviewedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "REJECTED" | "UNVERIFIED" | "EMAIL_VERIFIED" | "BUSINESS_VERIFIED";
        businessLicenseUrl?: string | undefined;
        emailVerifiedAt?: string | undefined;
        businessLicenseVerifiedAt?: string | undefined;
        rejectedReason?: string | undefined;
        submittedAt?: string | undefined;
        reviewedAt?: string | undefined;
    }, {
        status: "PENDING" | "REJECTED" | "UNVERIFIED" | "EMAIL_VERIFIED" | "BUSINESS_VERIFIED";
        businessLicenseUrl?: string | undefined;
        emailVerifiedAt?: string | undefined;
        businessLicenseVerifiedAt?: string | undefined;
        rejectedReason?: string | undefined;
        submittedAt?: string | undefined;
        reviewedAt?: string | undefined;
    }>;
    branding: z.ZodObject<{
        primaryColor: z.ZodOptional<z.ZodString>;
        logoUrl: z.ZodOptional<z.ZodString>;
        coverImageUrl: z.ZodOptional<z.ZodString>;
        companyPhotos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        videoUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        logoUrl?: string | undefined;
        primaryColor?: string | undefined;
        coverImageUrl?: string | undefined;
        companyPhotos?: string[] | undefined;
        videoUrl?: string | undefined;
    }, {
        logoUrl?: string | undefined;
        primaryColor?: string | undefined;
        coverImageUrl?: string | undefined;
        companyPhotos?: string[] | undefined;
        videoUrl?: string | undefined;
    }>;
    activeJobIds: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    agentId: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    verification: {
        status: "PENDING" | "REJECTED" | "UNVERIFIED" | "EMAIL_VERIFIED" | "BUSINESS_VERIFIED";
        businessLicenseUrl?: string | undefined;
        emailVerifiedAt?: string | undefined;
        businessLicenseVerifiedAt?: string | undefined;
        rejectedReason?: string | undefined;
        submittedAt?: string | undefined;
        reviewedAt?: string | undefined;
    };
    companyInfo: {
        city: string;
        address: string;
        name: string;
        industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
        size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
        description?: string | undefined;
        website?: string | undefined;
        logoUrl?: string | undefined;
        coverImageUrl?: string | undefined;
    };
    recruiterInfo: {
        title: string;
        name: string;
        email: string;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    };
    branding: {
        logoUrl?: string | undefined;
        primaryColor?: string | undefined;
        coverImageUrl?: string | undefined;
        companyPhotos?: string[] | undefined;
        videoUrl?: string | undefined;
    };
    activeJobIds: string[];
}, {
    id: string;
    agentId: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    verification: {
        status: "PENDING" | "REJECTED" | "UNVERIFIED" | "EMAIL_VERIFIED" | "BUSINESS_VERIFIED";
        businessLicenseUrl?: string | undefined;
        emailVerifiedAt?: string | undefined;
        businessLicenseVerifiedAt?: string | undefined;
        rejectedReason?: string | undefined;
        submittedAt?: string | undefined;
        reviewedAt?: string | undefined;
    };
    companyInfo: {
        city: string;
        address: string;
        name: string;
        industry: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE";
        size: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE";
        description?: string | undefined;
        website?: string | undefined;
        logoUrl?: string | undefined;
        coverImageUrl?: string | undefined;
    };
    recruiterInfo: {
        title: string;
        name: string;
        email: string;
        phone?: string | undefined;
        avatarUrl?: string | undefined;
    };
    branding: {
        logoUrl?: string | undefined;
        primaryColor?: string | undefined;
        coverImageUrl?: string | undefined;
        companyPhotos?: string[] | undefined;
        videoUrl?: string | undefined;
    };
    activeJobIds: string[];
}>;
//# sourceMappingURL=employerSchema.d.ts.map