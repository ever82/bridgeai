/**
 * Job Posting Schemas
 *
 * Zod schemas for job posting validation
 */
import { z } from 'zod';
export declare const jobStatusSchema: z.ZodEnum<["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED"]>;
export declare const jobTypeSchema: z.ZodEnum<["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]>;
export declare const experienceLevelSchema: z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "EXPERT"]>;
export declare const educationLevelSchema: z.ZodEnum<["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE", "NO_REQUIREMENT"]>;
export declare const salaryPeriodSchema: z.ZodEnum<["MONTHLY", "YEARLY", "HOURLY", "DAILY"]>;
export declare const applicationStatusSchema: z.ZodEnum<["PENDING", "VIEWED", "SHORTLISTED", "REJECTED", "INTERVIEWING", "OFFERED", "HIRED", "WITHDRAWN"]>;
export declare const jobTitleSchema: z.ZodString;
export declare const jobDepartmentSchema: z.ZodString;
export declare const jobDescriptionSchema: z.ZodString;
export declare const skillSchema: z.ZodString;
export declare const salaryRangeSchema: z.ZodEffects<z.ZodObject<{
    min: z.ZodNumber;
    max: z.ZodNumber;
    period: z.ZodEnum<["MONTHLY", "YEARLY", "HOURLY", "DAILY"]>;
    currency: z.ZodDefault<z.ZodString>;
    isNegotiable: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    min: number;
    max: number;
    currency: string;
    period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
    isNegotiable: boolean;
}, {
    min: number;
    max: number;
    period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
    currency?: string | undefined;
    isNegotiable?: boolean | undefined;
}>, {
    min: number;
    max: number;
    currency: string;
    period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
    isNegotiable: boolean;
}, {
    min: number;
    max: number;
    period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
    currency?: string | undefined;
    isNegotiable?: boolean | undefined;
}>;
export declare const jobRequirementSchema: z.ZodObject<{
    skills: z.ZodArray<z.ZodString, "many">;
    experienceLevel: z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "EXPERT"]>;
    educationLevel: z.ZodEnum<["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE", "NO_REQUIREMENT"]>;
    minExperienceYears: z.ZodOptional<z.ZodNumber>;
    maxExperienceYears: z.ZodOptional<z.ZodNumber>;
    languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    skills: string[];
    experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
    educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
    languages?: string[] | undefined;
    certifications?: string[] | undefined;
    minExperienceYears?: number | undefined;
    maxExperienceYears?: number | undefined;
}, {
    skills: string[];
    experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
    educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
    languages?: string[] | undefined;
    certifications?: string[] | undefined;
    minExperienceYears?: number | undefined;
    maxExperienceYears?: number | undefined;
}>;
export declare const jobBenefitsSchema: z.ZodObject<{
    healthInsurance: z.ZodDefault<z.ZodBoolean>;
    dentalInsurance: z.ZodDefault<z.ZodBoolean>;
    visionInsurance: z.ZodDefault<z.ZodBoolean>;
    lifeInsurance: z.ZodDefault<z.ZodBoolean>;
    retirementPlan: z.ZodDefault<z.ZodBoolean>;
    paidTimeOff: z.ZodDefault<z.ZodNumber>;
    flexibleSchedule: z.ZodDefault<z.ZodBoolean>;
    remoteWork: z.ZodDefault<z.ZodBoolean>;
    professionalDevelopment: z.ZodDefault<z.ZodBoolean>;
    gymMembership: z.ZodDefault<z.ZodBoolean>;
    freeMeals: z.ZodDefault<z.ZodBoolean>;
    transportation: z.ZodDefault<z.ZodBoolean>;
    stockOptions: z.ZodDefault<z.ZodBoolean>;
    bonus: z.ZodDefault<z.ZodBoolean>;
    other: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    bonus: boolean;
    healthInsurance: boolean;
    dentalInsurance: boolean;
    visionInsurance: boolean;
    lifeInsurance: boolean;
    retirementPlan: boolean;
    paidTimeOff: number;
    flexibleSchedule: boolean;
    remoteWork: boolean;
    professionalDevelopment: boolean;
    gymMembership: boolean;
    freeMeals: boolean;
    transportation: boolean;
    stockOptions: boolean;
    other?: string[] | undefined;
}, {
    other?: string[] | undefined;
    bonus?: boolean | undefined;
    healthInsurance?: boolean | undefined;
    dentalInsurance?: boolean | undefined;
    visionInsurance?: boolean | undefined;
    lifeInsurance?: boolean | undefined;
    retirementPlan?: boolean | undefined;
    paidTimeOff?: number | undefined;
    flexibleSchedule?: boolean | undefined;
    remoteWork?: boolean | undefined;
    professionalDevelopment?: boolean | undefined;
    gymMembership?: boolean | undefined;
    freeMeals?: boolean | undefined;
    transportation?: boolean | undefined;
    stockOptions?: boolean | undefined;
}>;
export declare const jobLocationSchema: z.ZodObject<{
    address: z.ZodString;
    city: z.ZodString;
    district: z.ZodOptional<z.ZodString>;
    country: z.ZodDefault<z.ZodString>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    isRemote: z.ZodDefault<z.ZodBoolean>;
    workMode: z.ZodEnum<["REMOTE", "ONSITE", "HYBRID"]>;
}, "strip", z.ZodTypeAny, {
    city: string;
    address: string;
    country: string;
    workMode: "ONSITE" | "REMOTE" | "HYBRID";
    isRemote: boolean;
    district?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
}, {
    city: string;
    address: string;
    workMode: "ONSITE" | "REMOTE" | "HYBRID";
    district?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    country?: string | undefined;
    isRemote?: boolean | undefined;
}>;
export declare const jobDescriptionStructuredSchema: z.ZodObject<{
    summary: z.ZodString;
    responsibilities: z.ZodArray<z.ZodString, "many">;
    requirements: z.ZodArray<z.ZodString, "many">;
    preferredQualifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    benefits: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    companyDescription: z.ZodOptional<z.ZodString>;
    teamDescription: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    requirements: string[];
    responsibilities: string[];
    benefits?: string[] | undefined;
    preferredQualifications?: string[] | undefined;
    companyDescription?: string | undefined;
    teamDescription?: string | undefined;
}, {
    summary: string;
    requirements: string[];
    responsibilities: string[];
    benefits?: string[] | undefined;
    preferredQualifications?: string[] | undefined;
    companyDescription?: string | undefined;
    teamDescription?: string | undefined;
}>;
export declare const jobStatsSchema: z.ZodObject<{
    views: z.ZodDefault<z.ZodNumber>;
    uniqueViews: z.ZodDefault<z.ZodNumber>;
    applications: z.ZodDefault<z.ZodNumber>;
    interested: z.ZodDefault<z.ZodNumber>;
    saved: z.ZodDefault<z.ZodNumber>;
    shared: z.ZodDefault<z.ZodNumber>;
    clickThroughRate: z.ZodDefault<z.ZodNumber>;
    conversionRate: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversionRate: number;
    applications: number;
    views: number;
    uniqueViews: number;
    interested: number;
    saved: number;
    shared: number;
    clickThroughRate: number;
}, {
    conversionRate?: number | undefined;
    applications?: number | undefined;
    views?: number | undefined;
    uniqueViews?: number | undefined;
    interested?: number | undefined;
    saved?: number | undefined;
    shared?: number | undefined;
    clickThroughRate?: number | undefined;
}>;
export declare const createJobPostingSchema: z.ZodObject<{
    title: z.ZodString;
    department: z.ZodString;
    type: z.ZodEnum<["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]>;
    positions: z.ZodDefault<z.ZodNumber>;
    description: z.ZodUnion<[z.ZodString, z.ZodObject<{
        summary: z.ZodString;
        responsibilities: z.ZodArray<z.ZodString, "many">;
        requirements: z.ZodArray<z.ZodString, "many">;
        preferredQualifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        benefits: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        companyDescription: z.ZodOptional<z.ZodString>;
        teamDescription: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    }, {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    }>]>;
    requirements: z.ZodObject<{
        skills: z.ZodArray<z.ZodString, "many">;
        experienceLevel: z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "EXPERT"]>;
        educationLevel: z.ZodEnum<["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE", "NO_REQUIREMENT"]>;
        minExperienceYears: z.ZodOptional<z.ZodNumber>;
        maxExperienceYears: z.ZodOptional<z.ZodNumber>;
        languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    }, {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    }>;
    salary: z.ZodEffects<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        period: z.ZodEnum<["MONTHLY", "YEARLY", "HOURLY", "DAILY"]>;
        currency: z.ZodDefault<z.ZodString>;
        isNegotiable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    }, {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    }>, {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    }, {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    }>;
    benefits: z.ZodOptional<z.ZodObject<{
        healthInsurance: z.ZodDefault<z.ZodBoolean>;
        dentalInsurance: z.ZodDefault<z.ZodBoolean>;
        visionInsurance: z.ZodDefault<z.ZodBoolean>;
        lifeInsurance: z.ZodDefault<z.ZodBoolean>;
        retirementPlan: z.ZodDefault<z.ZodBoolean>;
        paidTimeOff: z.ZodDefault<z.ZodNumber>;
        flexibleSchedule: z.ZodDefault<z.ZodBoolean>;
        remoteWork: z.ZodDefault<z.ZodBoolean>;
        professionalDevelopment: z.ZodDefault<z.ZodBoolean>;
        gymMembership: z.ZodDefault<z.ZodBoolean>;
        freeMeals: z.ZodDefault<z.ZodBoolean>;
        transportation: z.ZodDefault<z.ZodBoolean>;
        stockOptions: z.ZodDefault<z.ZodBoolean>;
        bonus: z.ZodDefault<z.ZodBoolean>;
        other: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        bonus: boolean;
        healthInsurance: boolean;
        dentalInsurance: boolean;
        visionInsurance: boolean;
        lifeInsurance: boolean;
        retirementPlan: boolean;
        paidTimeOff: number;
        flexibleSchedule: boolean;
        remoteWork: boolean;
        professionalDevelopment: boolean;
        gymMembership: boolean;
        freeMeals: boolean;
        transportation: boolean;
        stockOptions: boolean;
        other?: string[] | undefined;
    }, {
        other?: string[] | undefined;
        bonus?: boolean | undefined;
        healthInsurance?: boolean | undefined;
        dentalInsurance?: boolean | undefined;
        visionInsurance?: boolean | undefined;
        lifeInsurance?: boolean | undefined;
        retirementPlan?: boolean | undefined;
        paidTimeOff?: number | undefined;
        flexibleSchedule?: boolean | undefined;
        remoteWork?: boolean | undefined;
        professionalDevelopment?: boolean | undefined;
        gymMembership?: boolean | undefined;
        freeMeals?: boolean | undefined;
        transportation?: boolean | undefined;
        stockOptions?: boolean | undefined;
    }>>;
    location: z.ZodObject<{
        address: z.ZodString;
        city: z.ZodString;
        district: z.ZodOptional<z.ZodString>;
        country: z.ZodDefault<z.ZodString>;
        latitude: z.ZodOptional<z.ZodNumber>;
        longitude: z.ZodOptional<z.ZodNumber>;
        isRemote: z.ZodDefault<z.ZodBoolean>;
        workMode: z.ZodEnum<["REMOTE", "ONSITE", "HYBRID"]>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        address: string;
        country: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        isRemote: boolean;
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    }, {
        city: string;
        address: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        country?: string | undefined;
        isRemote?: boolean | undefined;
    }>;
    validUntil: z.ZodString;
    isUrgent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
    location: {
        city: string;
        address: string;
        country: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        isRemote: boolean;
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    };
    title: string;
    description: string | {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    };
    validUntil: string;
    isUrgent: boolean;
    salary: {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    };
    requirements: {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    };
    department: string;
    positions: number;
    benefits?: {
        bonus: boolean;
        healthInsurance: boolean;
        dentalInsurance: boolean;
        visionInsurance: boolean;
        lifeInsurance: boolean;
        retirementPlan: boolean;
        paidTimeOff: number;
        flexibleSchedule: boolean;
        remoteWork: boolean;
        professionalDevelopment: boolean;
        gymMembership: boolean;
        freeMeals: boolean;
        transportation: boolean;
        stockOptions: boolean;
        other?: string[] | undefined;
    } | undefined;
}, {
    type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
    location: {
        city: string;
        address: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        country?: string | undefined;
        isRemote?: boolean | undefined;
    };
    title: string;
    description: string | {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    };
    validUntil: string;
    salary: {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    };
    requirements: {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    };
    department: string;
    isUrgent?: boolean | undefined;
    benefits?: {
        other?: string[] | undefined;
        bonus?: boolean | undefined;
        healthInsurance?: boolean | undefined;
        dentalInsurance?: boolean | undefined;
        visionInsurance?: boolean | undefined;
        lifeInsurance?: boolean | undefined;
        retirementPlan?: boolean | undefined;
        paidTimeOff?: number | undefined;
        flexibleSchedule?: boolean | undefined;
        remoteWork?: boolean | undefined;
        professionalDevelopment?: boolean | undefined;
        gymMembership?: boolean | undefined;
        freeMeals?: boolean | undefined;
        transportation?: boolean | undefined;
        stockOptions?: boolean | undefined;
    } | undefined;
    positions?: number | undefined;
}>;
export declare const updateJobPostingSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]>>;
    positions: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
        summary: z.ZodString;
        responsibilities: z.ZodArray<z.ZodString, "many">;
        requirements: z.ZodArray<z.ZodString, "many">;
        preferredQualifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        benefits: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        companyDescription: z.ZodOptional<z.ZodString>;
        teamDescription: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    }, {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    }>]>>;
    requirements: z.ZodOptional<z.ZodObject<{
        skills: z.ZodArray<z.ZodString, "many">;
        experienceLevel: z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "EXPERT"]>;
        educationLevel: z.ZodEnum<["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE", "NO_REQUIREMENT"]>;
        minExperienceYears: z.ZodOptional<z.ZodNumber>;
        maxExperienceYears: z.ZodOptional<z.ZodNumber>;
        languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    }, {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    }>>;
    salary: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        period: z.ZodEnum<["MONTHLY", "YEARLY", "HOURLY", "DAILY"]>;
        currency: z.ZodDefault<z.ZodString>;
        isNegotiable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    }, {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    }>, {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    }, {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    }>>;
    benefits: z.ZodOptional<z.ZodObject<{
        healthInsurance: z.ZodDefault<z.ZodBoolean>;
        dentalInsurance: z.ZodDefault<z.ZodBoolean>;
        visionInsurance: z.ZodDefault<z.ZodBoolean>;
        lifeInsurance: z.ZodDefault<z.ZodBoolean>;
        retirementPlan: z.ZodDefault<z.ZodBoolean>;
        paidTimeOff: z.ZodDefault<z.ZodNumber>;
        flexibleSchedule: z.ZodDefault<z.ZodBoolean>;
        remoteWork: z.ZodDefault<z.ZodBoolean>;
        professionalDevelopment: z.ZodDefault<z.ZodBoolean>;
        gymMembership: z.ZodDefault<z.ZodBoolean>;
        freeMeals: z.ZodDefault<z.ZodBoolean>;
        transportation: z.ZodDefault<z.ZodBoolean>;
        stockOptions: z.ZodDefault<z.ZodBoolean>;
        bonus: z.ZodDefault<z.ZodBoolean>;
        other: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        bonus: boolean;
        healthInsurance: boolean;
        dentalInsurance: boolean;
        visionInsurance: boolean;
        lifeInsurance: boolean;
        retirementPlan: boolean;
        paidTimeOff: number;
        flexibleSchedule: boolean;
        remoteWork: boolean;
        professionalDevelopment: boolean;
        gymMembership: boolean;
        freeMeals: boolean;
        transportation: boolean;
        stockOptions: boolean;
        other?: string[] | undefined;
    }, {
        other?: string[] | undefined;
        bonus?: boolean | undefined;
        healthInsurance?: boolean | undefined;
        dentalInsurance?: boolean | undefined;
        visionInsurance?: boolean | undefined;
        lifeInsurance?: boolean | undefined;
        retirementPlan?: boolean | undefined;
        paidTimeOff?: number | undefined;
        flexibleSchedule?: boolean | undefined;
        remoteWork?: boolean | undefined;
        professionalDevelopment?: boolean | undefined;
        gymMembership?: boolean | undefined;
        freeMeals?: boolean | undefined;
        transportation?: boolean | undefined;
        stockOptions?: boolean | undefined;
    }>>;
    location: z.ZodOptional<z.ZodObject<{
        address: z.ZodString;
        city: z.ZodString;
        district: z.ZodOptional<z.ZodString>;
        country: z.ZodDefault<z.ZodString>;
        latitude: z.ZodOptional<z.ZodNumber>;
        longitude: z.ZodOptional<z.ZodNumber>;
        isRemote: z.ZodDefault<z.ZodBoolean>;
        workMode: z.ZodEnum<["REMOTE", "ONSITE", "HYBRID"]>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        address: string;
        country: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        isRemote: boolean;
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    }, {
        city: string;
        address: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        country?: string | undefined;
        isRemote?: boolean | undefined;
    }>>;
    validUntil: z.ZodOptional<z.ZodString>;
    isUrgent: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" | undefined;
    location?: {
        city: string;
        address: string;
        country: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        isRemote: boolean;
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    } | undefined;
    title?: string | undefined;
    description?: string | {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    } | undefined;
    validUntil?: string | undefined;
    isUrgent?: boolean | undefined;
    salary?: {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    } | undefined;
    benefits?: {
        bonus: boolean;
        healthInsurance: boolean;
        dentalInsurance: boolean;
        visionInsurance: boolean;
        lifeInsurance: boolean;
        retirementPlan: boolean;
        paidTimeOff: number;
        flexibleSchedule: boolean;
        remoteWork: boolean;
        professionalDevelopment: boolean;
        gymMembership: boolean;
        freeMeals: boolean;
        transportation: boolean;
        stockOptions: boolean;
        other?: string[] | undefined;
    } | undefined;
    requirements?: {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    } | undefined;
    department?: string | undefined;
    positions?: number | undefined;
}, {
    type?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" | undefined;
    location?: {
        city: string;
        address: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        country?: string | undefined;
        isRemote?: boolean | undefined;
    } | undefined;
    title?: string | undefined;
    description?: string | {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    } | undefined;
    validUntil?: string | undefined;
    isUrgent?: boolean | undefined;
    salary?: {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    } | undefined;
    benefits?: {
        other?: string[] | undefined;
        bonus?: boolean | undefined;
        healthInsurance?: boolean | undefined;
        dentalInsurance?: boolean | undefined;
        visionInsurance?: boolean | undefined;
        lifeInsurance?: boolean | undefined;
        retirementPlan?: boolean | undefined;
        paidTimeOff?: number | undefined;
        flexibleSchedule?: boolean | undefined;
        remoteWork?: boolean | undefined;
        professionalDevelopment?: boolean | undefined;
        gymMembership?: boolean | undefined;
        freeMeals?: boolean | undefined;
        transportation?: boolean | undefined;
        stockOptions?: boolean | undefined;
    } | undefined;
    requirements?: {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    } | undefined;
    department?: string | undefined;
    positions?: number | undefined;
}>;
export declare const updateJobStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED";
    reason?: string | undefined;
}, {
    status: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED";
    reason?: string | undefined;
}>;
export declare const refreshJobSchema: z.ZodObject<{
    isFeatured: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isFeatured?: boolean | undefined;
}, {
    isFeatured?: boolean | undefined;
}>;
export declare const jobFilterSchema: z.ZodObject<{
    keyword: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    workMode: z.ZodOptional<z.ZodEnum<["REMOTE", "ONSITE", "HYBRID"]>>;
    jobType: z.ZodOptional<z.ZodEnum<["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]>>;
    experienceLevel: z.ZodOptional<z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "EXPERT"]>>;
    educationLevel: z.ZodOptional<z.ZodEnum<["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE", "NO_REQUIREMENT"]>>;
    minSalary: z.ZodOptional<z.ZodNumber>;
    maxSalary: z.ZodOptional<z.ZodNumber>;
    skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    industry: z.ZodOptional<z.ZodEnum<["TECH", "FINANCE", "HEALTHCARE", "EDUCATION", "MANUFACTURING", "RETAIL", "CONSULTING", "MEDIA", "REAL_ESTATE", "OTHER"]>>;
    companySize: z.ZodOptional<z.ZodEnum<["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]>>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED"]>>;
    isUrgent: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "updatedAt", "salary", "viewCount"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortBy: "createdAt" | "updatedAt" | "viewCount" | "salary";
    sortOrder: "asc" | "desc";
    city?: string | undefined;
    status?: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED" | undefined;
    skills?: string[] | undefined;
    keyword?: string | undefined;
    workMode?: "ONSITE" | "REMOTE" | "HYBRID" | undefined;
    jobType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" | undefined;
    experienceLevel?: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT" | undefined;
    educationLevel?: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT" | undefined;
    minSalary?: number | undefined;
    maxSalary?: number | undefined;
    industry?: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE" | undefined;
    companySize?: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE" | undefined;
    isUrgent?: boolean | undefined;
}, {
    limit?: number | undefined;
    page?: number | undefined;
    city?: string | undefined;
    status?: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED" | undefined;
    skills?: string[] | undefined;
    keyword?: string | undefined;
    workMode?: "ONSITE" | "REMOTE" | "HYBRID" | undefined;
    jobType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" | undefined;
    experienceLevel?: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT" | undefined;
    educationLevel?: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT" | undefined;
    minSalary?: number | undefined;
    maxSalary?: number | undefined;
    industry?: "TECH" | "OTHER" | "FINANCE" | "HEALTHCARE" | "EDUCATION" | "MANUFACTURING" | "RETAIL" | "CONSULTING" | "MEDIA" | "REAL_ESTATE" | undefined;
    companySize?: "MEDIUM" | "STARTUP" | "SMALL" | "LARGE" | "ENTERPRISE" | undefined;
    isUrgent?: boolean | undefined;
    sortBy?: "createdAt" | "updatedAt" | "viewCount" | "salary" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const createJobApplicationSchema: z.ZodObject<{
    jobId: z.ZodString;
    coverLetter: z.ZodOptional<z.ZodString>;
    resumeUrl: z.ZodOptional<z.ZodString>;
    answers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    coverLetter?: string | undefined;
    resumeUrl?: string | undefined;
    answers?: Record<string, string> | undefined;
}, {
    jobId: string;
    coverLetter?: string | undefined;
    resumeUrl?: string | undefined;
    answers?: Record<string, string> | undefined;
}>;
export declare const updateApplicationStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["PENDING", "VIEWED", "SHORTLISTED", "REJECTED", "INTERVIEWING", "OFFERED", "HIRED", "WITHDRAWN"]>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "REJECTED" | "VIEWED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "HIRED" | "WITHDRAWN";
    notes?: string | undefined;
}, {
    status: "PENDING" | "REJECTED" | "VIEWED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "HIRED" | "WITHDRAWN";
    notes?: string | undefined;
}>;
export declare const applicationFilterSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["PENDING", "VIEWED", "SHORTLISTED", "REJECTED", "INTERVIEWING", "OFFERED", "HIRED", "WITHDRAWN"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "PENDING" | "REJECTED" | "VIEWED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "HIRED" | "WITHDRAWN" | undefined;
}, {
    limit?: number | undefined;
    page?: number | undefined;
    status?: "PENDING" | "REJECTED" | "VIEWED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "HIRED" | "WITHDRAWN" | undefined;
}>;
export declare const jobPostingResponseSchema: z.ZodObject<{
    id: z.ZodString;
    employerId: z.ZodString;
    employerProfileId: z.ZodString;
    agentId: z.ZodString;
    title: z.ZodString;
    department: z.ZodString;
    type: z.ZodEnum<["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]>;
    positions: z.ZodNumber;
    description: z.ZodObject<{
        summary: z.ZodString;
        responsibilities: z.ZodArray<z.ZodString, "many">;
        requirements: z.ZodArray<z.ZodString, "many">;
        preferredQualifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        benefits: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        companyDescription: z.ZodOptional<z.ZodString>;
        teamDescription: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    }, {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    }>;
    requirements: z.ZodObject<{
        skills: z.ZodArray<z.ZodString, "many">;
        experienceLevel: z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "EXPERT"]>;
        educationLevel: z.ZodEnum<["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE", "NO_REQUIREMENT"]>;
        minExperienceYears: z.ZodOptional<z.ZodNumber>;
        maxExperienceYears: z.ZodOptional<z.ZodNumber>;
        languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    }, {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    }>;
    salary: z.ZodEffects<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        period: z.ZodEnum<["MONTHLY", "YEARLY", "HOURLY", "DAILY"]>;
        currency: z.ZodDefault<z.ZodString>;
        isNegotiable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    }, {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    }>, {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    }, {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    }>;
    benefits: z.ZodObject<{
        healthInsurance: z.ZodDefault<z.ZodBoolean>;
        dentalInsurance: z.ZodDefault<z.ZodBoolean>;
        visionInsurance: z.ZodDefault<z.ZodBoolean>;
        lifeInsurance: z.ZodDefault<z.ZodBoolean>;
        retirementPlan: z.ZodDefault<z.ZodBoolean>;
        paidTimeOff: z.ZodDefault<z.ZodNumber>;
        flexibleSchedule: z.ZodDefault<z.ZodBoolean>;
        remoteWork: z.ZodDefault<z.ZodBoolean>;
        professionalDevelopment: z.ZodDefault<z.ZodBoolean>;
        gymMembership: z.ZodDefault<z.ZodBoolean>;
        freeMeals: z.ZodDefault<z.ZodBoolean>;
        transportation: z.ZodDefault<z.ZodBoolean>;
        stockOptions: z.ZodDefault<z.ZodBoolean>;
        bonus: z.ZodDefault<z.ZodBoolean>;
        other: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        bonus: boolean;
        healthInsurance: boolean;
        dentalInsurance: boolean;
        visionInsurance: boolean;
        lifeInsurance: boolean;
        retirementPlan: boolean;
        paidTimeOff: number;
        flexibleSchedule: boolean;
        remoteWork: boolean;
        professionalDevelopment: boolean;
        gymMembership: boolean;
        freeMeals: boolean;
        transportation: boolean;
        stockOptions: boolean;
        other?: string[] | undefined;
    }, {
        other?: string[] | undefined;
        bonus?: boolean | undefined;
        healthInsurance?: boolean | undefined;
        dentalInsurance?: boolean | undefined;
        visionInsurance?: boolean | undefined;
        lifeInsurance?: boolean | undefined;
        retirementPlan?: boolean | undefined;
        paidTimeOff?: number | undefined;
        flexibleSchedule?: boolean | undefined;
        remoteWork?: boolean | undefined;
        professionalDevelopment?: boolean | undefined;
        gymMembership?: boolean | undefined;
        freeMeals?: boolean | undefined;
        transportation?: boolean | undefined;
        stockOptions?: boolean | undefined;
    }>;
    location: z.ZodObject<{
        address: z.ZodString;
        city: z.ZodString;
        district: z.ZodOptional<z.ZodString>;
        country: z.ZodDefault<z.ZodString>;
        latitude: z.ZodOptional<z.ZodNumber>;
        longitude: z.ZodOptional<z.ZodNumber>;
        isRemote: z.ZodDefault<z.ZodBoolean>;
        workMode: z.ZodEnum<["REMOTE", "ONSITE", "HYBRID"]>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        address: string;
        country: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        isRemote: boolean;
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    }, {
        city: string;
        address: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        country?: string | undefined;
        isRemote?: boolean | undefined;
    }>;
    status: z.ZodEnum<["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED"]>;
    validFrom: z.ZodString;
    validUntil: z.ZodString;
    stats: z.ZodObject<{
        views: z.ZodDefault<z.ZodNumber>;
        uniqueViews: z.ZodDefault<z.ZodNumber>;
        applications: z.ZodDefault<z.ZodNumber>;
        interested: z.ZodDefault<z.ZodNumber>;
        saved: z.ZodDefault<z.ZodNumber>;
        shared: z.ZodDefault<z.ZodNumber>;
        clickThroughRate: z.ZodDefault<z.ZodNumber>;
        conversionRate: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        conversionRate: number;
        applications: number;
        views: number;
        uniqueViews: number;
        interested: number;
        saved: number;
        shared: number;
        clickThroughRate: number;
    }, {
        conversionRate?: number | undefined;
        applications?: number | undefined;
        views?: number | undefined;
        uniqueViews?: number | undefined;
        interested?: number | undefined;
        saved?: number | undefined;
        shared?: number | undefined;
        clickThroughRate?: number | undefined;
    }>;
    extractedSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    skillMatchScore: z.ZodOptional<z.ZodNumber>;
    competitivenessScore: z.ZodOptional<z.ZodNumber>;
    isUrgent: z.ZodBoolean;
    isFeatured: z.ZodBoolean;
    viewCount: z.ZodNumber;
    applicationCount: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    publishedAt: z.ZodOptional<z.ZodString>;
    refreshedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
    status: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED";
    location: {
        city: string;
        address: string;
        country: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        isRemote: boolean;
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
    };
    agentId: string;
    title: string;
    description: {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    };
    createdAt: string;
    updatedAt: string;
    validUntil: string;
    isUrgent: boolean;
    validFrom: string;
    viewCount: number;
    salary: {
        min: number;
        max: number;
        currency: string;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        isNegotiable: boolean;
    };
    benefits: {
        bonus: boolean;
        healthInsurance: boolean;
        dentalInsurance: boolean;
        visionInsurance: boolean;
        lifeInsurance: boolean;
        retirementPlan: boolean;
        paidTimeOff: number;
        flexibleSchedule: boolean;
        remoteWork: boolean;
        professionalDevelopment: boolean;
        gymMembership: boolean;
        freeMeals: boolean;
        transportation: boolean;
        stockOptions: boolean;
        other?: string[] | undefined;
    };
    stats: {
        conversionRate: number;
        applications: number;
        views: number;
        uniqueViews: number;
        interested: number;
        saved: number;
        shared: number;
        clickThroughRate: number;
    };
    requirements: {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    };
    employerId: string;
    employerProfileId: string;
    department: string;
    positions: number;
    isFeatured: boolean;
    applicationCount: number;
    extractedSkills?: string[] | undefined;
    skillMatchScore?: number | undefined;
    competitivenessScore?: number | undefined;
    publishedAt?: string | undefined;
    refreshedAt?: string | undefined;
}, {
    id: string;
    type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
    status: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED";
    location: {
        city: string;
        address: string;
        workMode: "ONSITE" | "REMOTE" | "HYBRID";
        district?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        country?: string | undefined;
        isRemote?: boolean | undefined;
    };
    agentId: string;
    title: string;
    description: {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    };
    createdAt: string;
    updatedAt: string;
    validUntil: string;
    isUrgent: boolean;
    validFrom: string;
    viewCount: number;
    salary: {
        min: number;
        max: number;
        period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
        currency?: string | undefined;
        isNegotiable?: boolean | undefined;
    };
    benefits: {
        other?: string[] | undefined;
        bonus?: boolean | undefined;
        healthInsurance?: boolean | undefined;
        dentalInsurance?: boolean | undefined;
        visionInsurance?: boolean | undefined;
        lifeInsurance?: boolean | undefined;
        retirementPlan?: boolean | undefined;
        paidTimeOff?: number | undefined;
        flexibleSchedule?: boolean | undefined;
        remoteWork?: boolean | undefined;
        professionalDevelopment?: boolean | undefined;
        gymMembership?: boolean | undefined;
        freeMeals?: boolean | undefined;
        transportation?: boolean | undefined;
        stockOptions?: boolean | undefined;
    };
    stats: {
        conversionRate?: number | undefined;
        applications?: number | undefined;
        views?: number | undefined;
        uniqueViews?: number | undefined;
        interested?: number | undefined;
        saved?: number | undefined;
        shared?: number | undefined;
        clickThroughRate?: number | undefined;
    };
    requirements: {
        skills: string[];
        experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
        educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
        languages?: string[] | undefined;
        certifications?: string[] | undefined;
        minExperienceYears?: number | undefined;
        maxExperienceYears?: number | undefined;
    };
    employerId: string;
    employerProfileId: string;
    department: string;
    positions: number;
    isFeatured: boolean;
    applicationCount: number;
    extractedSkills?: string[] | undefined;
    skillMatchScore?: number | undefined;
    competitivenessScore?: number | undefined;
    publishedAt?: string | undefined;
    refreshedAt?: string | undefined;
}>;
export declare const jobApplicationResponseSchema: z.ZodObject<{
    id: z.ZodString;
    jobId: z.ZodString;
    applicantId: z.ZodString;
    applicantAgentId: z.ZodString;
    status: z.ZodEnum<["PENDING", "VIEWED", "SHORTLISTED", "REJECTED", "INTERVIEWING", "OFFERED", "HIRED", "WITHDRAWN"]>;
    coverLetter: z.ZodOptional<z.ZodString>;
    resumeUrl: z.ZodOptional<z.ZodString>;
    answers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    notes: z.ZodOptional<z.ZodString>;
    viewedAt: z.ZodOptional<z.ZodString>;
    respondedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "PENDING" | "REJECTED" | "VIEWED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "HIRED" | "WITHDRAWN";
    createdAt: string;
    updatedAt: string;
    jobId: string;
    applicantId: string;
    applicantAgentId: string;
    notes?: string | undefined;
    coverLetter?: string | undefined;
    resumeUrl?: string | undefined;
    answers?: Record<string, string> | undefined;
    viewedAt?: string | undefined;
    respondedAt?: string | undefined;
}, {
    id: string;
    status: "PENDING" | "REJECTED" | "VIEWED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "HIRED" | "WITHDRAWN";
    createdAt: string;
    updatedAt: string;
    jobId: string;
    applicantId: string;
    applicantAgentId: string;
    notes?: string | undefined;
    coverLetter?: string | undefined;
    resumeUrl?: string | undefined;
    answers?: Record<string, string> | undefined;
    viewedAt?: string | undefined;
    respondedAt?: string | undefined;
}>;
export declare const jobListResponseSchema: z.ZodObject<{
    jobs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        employerId: z.ZodString;
        employerProfileId: z.ZodString;
        agentId: z.ZodString;
        title: z.ZodString;
        department: z.ZodString;
        type: z.ZodEnum<["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]>;
        positions: z.ZodNumber;
        description: z.ZodObject<{
            summary: z.ZodString;
            responsibilities: z.ZodArray<z.ZodString, "many">;
            requirements: z.ZodArray<z.ZodString, "many">;
            preferredQualifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            benefits: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            companyDescription: z.ZodOptional<z.ZodString>;
            teamDescription: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            summary: string;
            requirements: string[];
            responsibilities: string[];
            benefits?: string[] | undefined;
            preferredQualifications?: string[] | undefined;
            companyDescription?: string | undefined;
            teamDescription?: string | undefined;
        }, {
            summary: string;
            requirements: string[];
            responsibilities: string[];
            benefits?: string[] | undefined;
            preferredQualifications?: string[] | undefined;
            companyDescription?: string | undefined;
            teamDescription?: string | undefined;
        }>;
        requirements: z.ZodObject<{
            skills: z.ZodArray<z.ZodString, "many">;
            experienceLevel: z.ZodEnum<["ENTRY", "JUNIOR", "MID", "SENIOR", "EXPERT"]>;
            educationLevel: z.ZodEnum<["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE", "NO_REQUIREMENT"]>;
            minExperienceYears: z.ZodOptional<z.ZodNumber>;
            maxExperienceYears: z.ZodOptional<z.ZodNumber>;
            languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            skills: string[];
            experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
            educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
            minExperienceYears?: number | undefined;
            maxExperienceYears?: number | undefined;
        }, {
            skills: string[];
            experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
            educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
            minExperienceYears?: number | undefined;
            maxExperienceYears?: number | undefined;
        }>;
        salary: z.ZodEffects<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
            period: z.ZodEnum<["MONTHLY", "YEARLY", "HOURLY", "DAILY"]>;
            currency: z.ZodDefault<z.ZodString>;
            isNegotiable: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
            currency: string;
            period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
            isNegotiable: boolean;
        }, {
            min: number;
            max: number;
            period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
            currency?: string | undefined;
            isNegotiable?: boolean | undefined;
        }>, {
            min: number;
            max: number;
            currency: string;
            period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
            isNegotiable: boolean;
        }, {
            min: number;
            max: number;
            period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
            currency?: string | undefined;
            isNegotiable?: boolean | undefined;
        }>;
        benefits: z.ZodObject<{
            healthInsurance: z.ZodDefault<z.ZodBoolean>;
            dentalInsurance: z.ZodDefault<z.ZodBoolean>;
            visionInsurance: z.ZodDefault<z.ZodBoolean>;
            lifeInsurance: z.ZodDefault<z.ZodBoolean>;
            retirementPlan: z.ZodDefault<z.ZodBoolean>;
            paidTimeOff: z.ZodDefault<z.ZodNumber>;
            flexibleSchedule: z.ZodDefault<z.ZodBoolean>;
            remoteWork: z.ZodDefault<z.ZodBoolean>;
            professionalDevelopment: z.ZodDefault<z.ZodBoolean>;
            gymMembership: z.ZodDefault<z.ZodBoolean>;
            freeMeals: z.ZodDefault<z.ZodBoolean>;
            transportation: z.ZodDefault<z.ZodBoolean>;
            stockOptions: z.ZodDefault<z.ZodBoolean>;
            bonus: z.ZodDefault<z.ZodBoolean>;
            other: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            bonus: boolean;
            healthInsurance: boolean;
            dentalInsurance: boolean;
            visionInsurance: boolean;
            lifeInsurance: boolean;
            retirementPlan: boolean;
            paidTimeOff: number;
            flexibleSchedule: boolean;
            remoteWork: boolean;
            professionalDevelopment: boolean;
            gymMembership: boolean;
            freeMeals: boolean;
            transportation: boolean;
            stockOptions: boolean;
            other?: string[] | undefined;
        }, {
            other?: string[] | undefined;
            bonus?: boolean | undefined;
            healthInsurance?: boolean | undefined;
            dentalInsurance?: boolean | undefined;
            visionInsurance?: boolean | undefined;
            lifeInsurance?: boolean | undefined;
            retirementPlan?: boolean | undefined;
            paidTimeOff?: number | undefined;
            flexibleSchedule?: boolean | undefined;
            remoteWork?: boolean | undefined;
            professionalDevelopment?: boolean | undefined;
            gymMembership?: boolean | undefined;
            freeMeals?: boolean | undefined;
            transportation?: boolean | undefined;
            stockOptions?: boolean | undefined;
        }>;
        location: z.ZodObject<{
            address: z.ZodString;
            city: z.ZodString;
            district: z.ZodOptional<z.ZodString>;
            country: z.ZodDefault<z.ZodString>;
            latitude: z.ZodOptional<z.ZodNumber>;
            longitude: z.ZodOptional<z.ZodNumber>;
            isRemote: z.ZodDefault<z.ZodBoolean>;
            workMode: z.ZodEnum<["REMOTE", "ONSITE", "HYBRID"]>;
        }, "strip", z.ZodTypeAny, {
            city: string;
            address: string;
            country: string;
            workMode: "ONSITE" | "REMOTE" | "HYBRID";
            isRemote: boolean;
            district?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
        }, {
            city: string;
            address: string;
            workMode: "ONSITE" | "REMOTE" | "HYBRID";
            district?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            country?: string | undefined;
            isRemote?: boolean | undefined;
        }>;
        status: z.ZodEnum<["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED"]>;
        validFrom: z.ZodString;
        validUntil: z.ZodString;
        stats: z.ZodObject<{
            views: z.ZodDefault<z.ZodNumber>;
            uniqueViews: z.ZodDefault<z.ZodNumber>;
            applications: z.ZodDefault<z.ZodNumber>;
            interested: z.ZodDefault<z.ZodNumber>;
            saved: z.ZodDefault<z.ZodNumber>;
            shared: z.ZodDefault<z.ZodNumber>;
            clickThroughRate: z.ZodDefault<z.ZodNumber>;
            conversionRate: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            conversionRate: number;
            applications: number;
            views: number;
            uniqueViews: number;
            interested: number;
            saved: number;
            shared: number;
            clickThroughRate: number;
        }, {
            conversionRate?: number | undefined;
            applications?: number | undefined;
            views?: number | undefined;
            uniqueViews?: number | undefined;
            interested?: number | undefined;
            saved?: number | undefined;
            shared?: number | undefined;
            clickThroughRate?: number | undefined;
        }>;
        extractedSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        skillMatchScore: z.ZodOptional<z.ZodNumber>;
        competitivenessScore: z.ZodOptional<z.ZodNumber>;
        isUrgent: z.ZodBoolean;
        isFeatured: z.ZodBoolean;
        viewCount: z.ZodNumber;
        applicationCount: z.ZodNumber;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        publishedAt: z.ZodOptional<z.ZodString>;
        refreshedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
        status: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED";
        location: {
            city: string;
            address: string;
            country: string;
            workMode: "ONSITE" | "REMOTE" | "HYBRID";
            isRemote: boolean;
            district?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
        };
        agentId: string;
        title: string;
        description: {
            summary: string;
            requirements: string[];
            responsibilities: string[];
            benefits?: string[] | undefined;
            preferredQualifications?: string[] | undefined;
            companyDescription?: string | undefined;
            teamDescription?: string | undefined;
        };
        createdAt: string;
        updatedAt: string;
        validUntil: string;
        isUrgent: boolean;
        validFrom: string;
        viewCount: number;
        salary: {
            min: number;
            max: number;
            currency: string;
            period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
            isNegotiable: boolean;
        };
        benefits: {
            bonus: boolean;
            healthInsurance: boolean;
            dentalInsurance: boolean;
            visionInsurance: boolean;
            lifeInsurance: boolean;
            retirementPlan: boolean;
            paidTimeOff: number;
            flexibleSchedule: boolean;
            remoteWork: boolean;
            professionalDevelopment: boolean;
            gymMembership: boolean;
            freeMeals: boolean;
            transportation: boolean;
            stockOptions: boolean;
            other?: string[] | undefined;
        };
        stats: {
            conversionRate: number;
            applications: number;
            views: number;
            uniqueViews: number;
            interested: number;
            saved: number;
            shared: number;
            clickThroughRate: number;
        };
        requirements: {
            skills: string[];
            experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
            educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
            minExperienceYears?: number | undefined;
            maxExperienceYears?: number | undefined;
        };
        employerId: string;
        employerProfileId: string;
        department: string;
        positions: number;
        isFeatured: boolean;
        applicationCount: number;
        extractedSkills?: string[] | undefined;
        skillMatchScore?: number | undefined;
        competitivenessScore?: number | undefined;
        publishedAt?: string | undefined;
        refreshedAt?: string | undefined;
    }, {
        id: string;
        type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
        status: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED";
        location: {
            city: string;
            address: string;
            workMode: "ONSITE" | "REMOTE" | "HYBRID";
            district?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            country?: string | undefined;
            isRemote?: boolean | undefined;
        };
        agentId: string;
        title: string;
        description: {
            summary: string;
            requirements: string[];
            responsibilities: string[];
            benefits?: string[] | undefined;
            preferredQualifications?: string[] | undefined;
            companyDescription?: string | undefined;
            teamDescription?: string | undefined;
        };
        createdAt: string;
        updatedAt: string;
        validUntil: string;
        isUrgent: boolean;
        validFrom: string;
        viewCount: number;
        salary: {
            min: number;
            max: number;
            period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
            currency?: string | undefined;
            isNegotiable?: boolean | undefined;
        };
        benefits: {
            other?: string[] | undefined;
            bonus?: boolean | undefined;
            healthInsurance?: boolean | undefined;
            dentalInsurance?: boolean | undefined;
            visionInsurance?: boolean | undefined;
            lifeInsurance?: boolean | undefined;
            retirementPlan?: boolean | undefined;
            paidTimeOff?: number | undefined;
            flexibleSchedule?: boolean | undefined;
            remoteWork?: boolean | undefined;
            professionalDevelopment?: boolean | undefined;
            gymMembership?: boolean | undefined;
            freeMeals?: boolean | undefined;
            transportation?: boolean | undefined;
            stockOptions?: boolean | undefined;
        };
        stats: {
            conversionRate?: number | undefined;
            applications?: number | undefined;
            views?: number | undefined;
            uniqueViews?: number | undefined;
            interested?: number | undefined;
            saved?: number | undefined;
            shared?: number | undefined;
            clickThroughRate?: number | undefined;
        };
        requirements: {
            skills: string[];
            experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
            educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
            minExperienceYears?: number | undefined;
            maxExperienceYears?: number | undefined;
        };
        employerId: string;
        employerProfileId: string;
        department: string;
        positions: number;
        isFeatured: boolean;
        applicationCount: number;
        extractedSkills?: string[] | undefined;
        skillMatchScore?: number | undefined;
        competitivenessScore?: number | undefined;
        publishedAt?: string | undefined;
        refreshedAt?: string | undefined;
    }>, "many">;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    pagination: {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    jobs: {
        id: string;
        type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
        status: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED";
        location: {
            city: string;
            address: string;
            country: string;
            workMode: "ONSITE" | "REMOTE" | "HYBRID";
            isRemote: boolean;
            district?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
        };
        agentId: string;
        title: string;
        description: {
            summary: string;
            requirements: string[];
            responsibilities: string[];
            benefits?: string[] | undefined;
            preferredQualifications?: string[] | undefined;
            companyDescription?: string | undefined;
            teamDescription?: string | undefined;
        };
        createdAt: string;
        updatedAt: string;
        validUntil: string;
        isUrgent: boolean;
        validFrom: string;
        viewCount: number;
        salary: {
            min: number;
            max: number;
            currency: string;
            period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
            isNegotiable: boolean;
        };
        benefits: {
            bonus: boolean;
            healthInsurance: boolean;
            dentalInsurance: boolean;
            visionInsurance: boolean;
            lifeInsurance: boolean;
            retirementPlan: boolean;
            paidTimeOff: number;
            flexibleSchedule: boolean;
            remoteWork: boolean;
            professionalDevelopment: boolean;
            gymMembership: boolean;
            freeMeals: boolean;
            transportation: boolean;
            stockOptions: boolean;
            other?: string[] | undefined;
        };
        stats: {
            conversionRate: number;
            applications: number;
            views: number;
            uniqueViews: number;
            interested: number;
            saved: number;
            shared: number;
            clickThroughRate: number;
        };
        requirements: {
            skills: string[];
            experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
            educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
            minExperienceYears?: number | undefined;
            maxExperienceYears?: number | undefined;
        };
        employerId: string;
        employerProfileId: string;
        department: string;
        positions: number;
        isFeatured: boolean;
        applicationCount: number;
        extractedSkills?: string[] | undefined;
        skillMatchScore?: number | undefined;
        competitivenessScore?: number | undefined;
        publishedAt?: string | undefined;
        refreshedAt?: string | undefined;
    }[];
}, {
    pagination: {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    jobs: {
        id: string;
        type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
        status: "CLOSED" | "EXPIRED" | "DRAFT" | "PAUSED" | "PUBLISHED";
        location: {
            city: string;
            address: string;
            workMode: "ONSITE" | "REMOTE" | "HYBRID";
            district?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            country?: string | undefined;
            isRemote?: boolean | undefined;
        };
        agentId: string;
        title: string;
        description: {
            summary: string;
            requirements: string[];
            responsibilities: string[];
            benefits?: string[] | undefined;
            preferredQualifications?: string[] | undefined;
            companyDescription?: string | undefined;
            teamDescription?: string | undefined;
        };
        createdAt: string;
        updatedAt: string;
        validUntil: string;
        isUrgent: boolean;
        validFrom: string;
        viewCount: number;
        salary: {
            min: number;
            max: number;
            period: "MONTHLY" | "YEARLY" | "HOURLY" | "DAILY";
            currency?: string | undefined;
            isNegotiable?: boolean | undefined;
        };
        benefits: {
            other?: string[] | undefined;
            bonus?: boolean | undefined;
            healthInsurance?: boolean | undefined;
            dentalInsurance?: boolean | undefined;
            visionInsurance?: boolean | undefined;
            lifeInsurance?: boolean | undefined;
            retirementPlan?: boolean | undefined;
            paidTimeOff?: number | undefined;
            flexibleSchedule?: boolean | undefined;
            remoteWork?: boolean | undefined;
            professionalDevelopment?: boolean | undefined;
            gymMembership?: boolean | undefined;
            freeMeals?: boolean | undefined;
            transportation?: boolean | undefined;
            stockOptions?: boolean | undefined;
        };
        stats: {
            conversionRate?: number | undefined;
            applications?: number | undefined;
            views?: number | undefined;
            uniqueViews?: number | undefined;
            interested?: number | undefined;
            saved?: number | undefined;
            shared?: number | undefined;
            clickThroughRate?: number | undefined;
        };
        requirements: {
            skills: string[];
            experienceLevel: "ENTRY" | "MID" | "JUNIOR" | "SENIOR" | "EXPERT";
            educationLevel: "MASTER" | "BACHELOR" | "HIGH_SCHOOL" | "ASSOCIATE" | "DOCTORATE" | "NO_REQUIREMENT";
            languages?: string[] | undefined;
            certifications?: string[] | undefined;
            minExperienceYears?: number | undefined;
            maxExperienceYears?: number | undefined;
        };
        employerId: string;
        employerProfileId: string;
        department: string;
        positions: number;
        isFeatured: boolean;
        applicationCount: number;
        extractedSkills?: string[] | undefined;
        skillMatchScore?: number | undefined;
        competitivenessScore?: number | undefined;
        publishedAt?: string | undefined;
        refreshedAt?: string | undefined;
    }[];
}>;
export declare const jobExtractionResultSchema: z.ZodObject<{
    structuredData: z.ZodObject<{
        summary: z.ZodString;
        responsibilities: z.ZodArray<z.ZodString, "many">;
        requirements: z.ZodArray<z.ZodString, "many">;
        preferredQualifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        benefits: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        companyDescription: z.ZodOptional<z.ZodString>;
        teamDescription: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    }, {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    }>;
    extractedSkills: z.ZodArray<z.ZodString, "many">;
    skillMatchScore: z.ZodNumber;
    competitivenessScore: z.ZodNumber;
    suggestions: z.ZodArray<z.ZodString, "many">;
    qualityScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    suggestions: string[];
    qualityScore: number;
    extractedSkills: string[];
    structuredData: {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    };
    skillMatchScore: number;
    competitivenessScore: number;
}, {
    suggestions: string[];
    qualityScore: number;
    extractedSkills: string[];
    structuredData: {
        summary: string;
        requirements: string[];
        responsibilities: string[];
        benefits?: string[] | undefined;
        preferredQualifications?: string[] | undefined;
        companyDescription?: string | undefined;
        teamDescription?: string | undefined;
    };
    skillMatchScore: number;
    competitivenessScore: number;
}>;
//# sourceMappingURL=jobPostingSchema.d.ts.map