/**
 * Mock for @bridgeai/shared
 *
 * Note: This mock provides stub types/functions for tests that don't need
 * the real module. Tests requiring real L2 schema functions should use
 * jest.requireActual('@bridgeai/shared') to bypass this mock.
 */
export declare enum DisclosureLevel {
    PUBLIC = "PUBLIC",
    AFTER_MATCH = "AFTER_MATCH",
    AFTER_CHAT = "AFTER_CHAT",
    AFTER_REFERRAL = "AFTER_REFERRAL"
}
export declare enum RelationshipStage {
    NONE = "NONE",
    MATCHED = "MATCHED",
    CHATTED = "CHATTED",
    REFERRED = "REFERRED"
}
export declare enum SceneCode {
    VISION_SHARE = "vision_share",
    AGENT_DATE = "agent_date",
    AGENT_JOB = "agent_job",
    AGENT_AD = "agent_ad"
}
export declare enum PointsTransactionType {
    EARN = "EARN",
    SPEND = "SPEND",
    FROZEN = "FROZEN",
    UNFROZEN = "UNFROZEN",
    TRANSFER_IN = "TRANSFER_IN",
    TRANSFER_OUT = "TRANSFER_OUT"
}
export declare enum FreezeStatus {
    FROZEN = "FROZEN",
    RELEASED = "RELEASED",
    USED = "USED"
}
export interface FieldDisclosure {
    fieldName: string;
    level: DisclosureLevel;
    isDisclosable: boolean;
    defaultLevel: DisclosureLevel;
}
export interface AgentDisclosureSettings {
    agentId: string;
    userId: string;
    fieldDisclosures: FieldDisclosure[];
    defaultLevel: DisclosureLevel;
    strictMode: boolean;
    updatedAt: string;
    createdAt: string;
}
export declare const DISCLOSURE_LEVEL_INFO: Record<DisclosureLevel, {
    level: DisclosureLevel;
    name: string;
    description: string;
    icon: string;
    color: string;
    order: number;
}>;
export declare const DEFAULT_FIELD_DISCLOSURES: FieldDisclosure[];
export declare const DISCLOSABLE_FIELDS: string[];
export declare function getRequiredStage(level: DisclosureLevel): RelationshipStage;
export declare function canDiscloseAtStage(requiredLevel: DisclosureLevel, currentStage: RelationshipStage): boolean;
export declare function createDefaultDisclosureSettings(agentId: string, userId: string): AgentDisclosureSettings;
export declare const isAndFilter: (expr: any) => boolean;
export declare const isOrFilter: (expr: any) => boolean;
export declare const isNotFilter: (expr: any) => boolean;
export declare const isFilterCondition: (expr: any) => boolean;
export declare enum SceneId {
    visionshare = "visionshare",
    agentdate = "agentdate",
    agentjob = "agentjob",
    agentad = "agentad"
}
export interface RangeFilter {
    min?: number;
    max?: number;
}
export interface EnumFilter<T = string> {
    include?: T[];
    exclude?: T[];
}
export interface TagsOverlapFilter {
    tags: string[];
    minOverlap?: number;
}
export interface VisionShareAttributeFilter {
    contentType?: EnumFilter;
    purpose?: EnumFilter;
    style?: EnumFilter;
    experienceLevel?: EnumFilter;
    priceRange?: RangeFilter;
    skillsOverlap?: TagsOverlapFilter;
}
export interface AgentDateAttributeFilter {
    ageRange?: RangeFilter;
    gender?: EnumFilter<Gender>;
    maritalStatus?: EnumFilter;
    hasChildren?: boolean;
    incomeRange?: RangeFilter;
    propertyStatus?: EnumFilter;
    education?: EnumFilter<EducationLevel>;
    interestsOverlap?: TagsOverlapFilter;
    locationPreference?: EnumFilter;
    personalityTraits?: EnumFilter;
    lifestyle?: EnumFilter;
}
export interface AgentJobAttributeFilter {
    jobType?: EnumFilter;
    jobCategory?: EnumFilter;
    targetPositions?: TagsOverlapFilter;
    expectedSalary?: RangeFilter;
    workLocation?: EnumFilter;
    workExperience?: EnumFilter;
    skillsOverlap?: TagsOverlapFilter;
    certifications?: EnumFilter;
    education?: EnumFilter<EducationLevel>;
    preferredCompanySize?: EnumFilter;
    availability?: EnumFilter;
}
export interface AgentAdAttributeFilter {
    adType?: EnumFilter;
    productCategory?: EnumFilter;
    targetAudience?: EnumFilter;
    campaignObjective?: EnumFilter;
    budgetRange?: RangeFilter;
    campaignDuration?: EnumFilter;
    keyFeaturesOverlap?: TagsOverlapFilter;
}
export type SceneAttributeFilter = VisionShareAttributeFilter | AgentDateAttributeFilter | AgentJobAttributeFilter | AgentAdAttributeFilter;
export interface AttributeFilterRequest {
    sceneId: SceneId;
    filters: SceneAttributeFilter;
}
export interface AttributeFilterResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface FieldDefinition {
    name: string;
    type: string;
    operators: string[];
    path?: string;
    nullable?: boolean;
    enumValues?: string[];
}
export interface FilterSchema {
    sceneId: string;
    fields: FieldDefinition[];
}
export declare const SCENE_FILTER_SCHEMAS: Record<SceneId, FilterSchema>;
export declare function getFilterSchemaForScene(sceneId: SceneId): FilterSchema;
export declare function getFilterableFieldsForScene(sceneId: SceneId): FieldDefinition[];
export type CreditLevel = 'excellent' | 'good' | 'general' | 'poor';
export declare const CREDIT_LEVEL_THRESHOLDS: Record<CreditLevel, {
    min: number;
    max: number;
}>;
export declare enum CreditLevelEnum {
    EXCELLENT = "excellent",
    GOOD = "good",
    GENERAL = "general",
    POOR = "poor"
}
export declare enum CreditFactorType {
    PROFILE = "profile",
    BEHAVIOR = "behavior",
    TRANSACTION = "transaction",
    SOCIAL = "social"
}
export interface FilterCondition {
    field: string;
    operator: string;
    value: any;
}
export interface FilterExpression {
    and?: FilterCondition[];
    or?: FilterCondition[];
    not?: FilterCondition;
}
export interface FilterDSL {
    where: FilterCondition | FilterExpression;
}
export declare enum AgentMessageType {
    DIRECT = "direct",
    GROUP = "group",
    SYSTEM = "system",
    COMMAND = "command",
    RESPONSE = "response",
    STATUS = "status",
    ERROR = "error"
}
export declare enum AgentType {
    PERSONAL = "personal",
    BUSINESS = "business",
    SERVICE = "service",
    SYSTEM = "system"
}
export declare enum MessagePriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    URGENT = 4
}
export declare enum AgentProtocolErrorCode {
    INVALID_FORMAT = "INVALID_FORMAT",
    UNSUPPORTED_VERSION = "UNSUPPORTED_VERSION",
    UNAUTHORIZED = "UNAUTHORIZED",
    RATE_LIMITED = "RATE_LIMITED",
    CONTENT_VIOLATION = "CONTENT_VIOLATION",
    RECIPIENT_NOT_FOUND = "RECIPIENT_NOT_FOUND",
    MESSAGE_EXPIRED = "MESSAGE_EXPIRED",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export interface AgentMessageMetadata {
    version: string;
    timestamp: string;
    priority: MessagePriority;
    requireAck: boolean;
    ttl: number;
    traceId: string;
    custom?: Record<string, unknown>;
}
export interface AgentIdentity {
    agentId: string;
    displayName: string;
    type: AgentType;
    ownerId: string;
    ownerName: string;
    avatarUrl?: string;
    trustScore: number;
    isVerified: boolean;
    capabilities: string[];
}
export interface AgentCreditInfo {
    score: number;
    level: number;
    trend: 'up' | 'down' | 'stable';
    history: Array<{
        date: string;
        score: number;
    }>;
    description: string;
}
export interface AgentMessage {
    id: string;
    type: AgentMessageType;
    sender: AgentIdentity;
    recipientId: string;
    content: {
        text?: string;
        data?: Record<string, unknown>;
        attachments?: Array<{
            type: string;
            url: string;
            name: string;
            size: number;
        }>;
    };
    metadata: AgentMessageMetadata;
    replyTo?: string;
    creditInfo?: AgentCreditInfo;
}
export interface AgentProtocolError {
    code: AgentProtocolErrorCode;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
}
export declare const PROTOCOL_VERSION = "1.0.0";
export declare function validateAgentMessage(_message: unknown): {
    valid: boolean;
    errors: string[];
};
export declare function createAgentMessage(params: any): AgentMessage;
export declare function isVersionCompatible(version: string): boolean;
declare function makeVisionShareConfig(): {
    id: "visionshare";
    metadata: {
        id: string;
        name: string;
        nameEn: string;
        description: string;
        icon: string;
        color: string;
        version: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
    fields: {
        id: string;
        name: string;
        label: string;
        type: string;
        required: boolean;
    }[];
    capabilities: ({
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        version: string;
        dependencies: any[];
        config: {
            maxFileSize: number;
            maxDuration: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        version: string;
        dependencies: string[];
        config?: undefined;
    })[];
    templates: {
        id: string;
        name: string;
        description: string;
        isPreset: boolean;
        isDefault: boolean;
        fieldValues: {
            contentType: string[];
        };
    }[];
    validation: {
        rules: any[];
        preventSubmitOnError: boolean;
        showWarnings: boolean;
    };
    ui: {
        sections: any[];
        layout: "tabs";
    };
};
export declare function getSceneConfig(sceneId: string): ReturnType<typeof makeVisionShareConfig> | undefined;
export declare function getAllSceneConfigs(): {
    id: "visionshare";
    metadata: {
        id: string;
        name: string;
        nameEn: string;
        description: string;
        icon: string;
        color: string;
        version: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
    fields: {
        id: string;
        name: string;
        label: string;
        type: string;
        required: boolean;
    }[];
    capabilities: ({
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        version: string;
        dependencies: any[];
        config: {
            maxFileSize: number;
            maxDuration: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        version: string;
        dependencies: string[];
        config?: undefined;
    })[];
    templates: {
        id: string;
        name: string;
        description: string;
        isPreset: boolean;
        isDefault: boolean;
        fieldValues: {
            contentType: string[];
        };
    }[];
    validation: {
        rules: any[];
        preventSubmitOnError: boolean;
        showWarnings: boolean;
    };
    ui: {
        sections: any[];
        layout: "tabs";
    };
}[];
export declare function getActiveSceneConfigs(): {
    id: "visionshare";
    metadata: {
        id: string;
        name: string;
        nameEn: string;
        description: string;
        icon: string;
        color: string;
        version: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
    fields: {
        id: string;
        name: string;
        label: string;
        type: string;
        required: boolean;
    }[];
    capabilities: ({
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        version: string;
        dependencies: any[];
        config: {
            maxFileSize: number;
            maxDuration: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        version: string;
        dependencies: string[];
        config?: undefined;
    })[];
    templates: {
        id: string;
        name: string;
        description: string;
        isPreset: boolean;
        isDefault: boolean;
        fieldValues: {
            contentType: string[];
        };
    }[];
    validation: {
        rules: any[];
        preventSubmitOnError: boolean;
        showWarnings: boolean;
    };
    ui: {
        sections: any[];
        layout: "tabs";
    };
}[];
export declare function getSceneInfo(sceneId: string): {
    id: "visionshare";
    name: string;
    description: string;
    icon: string;
    color: string;
    isActive: boolean;
    fieldCount: number;
    capabilityCount: number;
};
export declare function hasScene(sceneId: string): boolean;
export declare const SCENE_IDS: readonly string[];
export declare function serializeMessage(message: AgentMessage): string;
export declare function parseMessage(json: string): AgentMessage | null;
export declare enum SceneCode {
    VISION_SHARE = "vision_share",
    AGENT_DATE = "agent_date",
    AGENT_JOB = "agent_job",
    AGENT_AD = "agent_ad"
}
export declare enum PointsTransactionType {
    EARN = "EARN",
    SPEND = "SPEND",
    FROZEN = "FROZEN",
    UNFROZEN = "UNFROZEN",
    TRANSFER_IN = "TRANSFER_IN",
    TRANSFER_OUT = "TRANSFER_OUT"
}
export declare enum FreezeStatus {
    FROZEN = "FROZEN",
    RELEASED = "RELEASED",
    USED = "USED",
    EXPIRED = "EXPIRED"
}
export interface PointsAccount {
    id: string;
    userId: string;
    balance: number;
    totalEarned: number;
    totalSpent: number;
    frozenAmount: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface PointsTransaction {
    id: string;
    accountId: string;
    userId: string;
    type: PointsTransactionType;
    amount: number;
    balanceAfter: number;
    description?: string;
    scene?: SceneCode;
    referenceId?: string;
    metadata?: string;
    createdAt: Date;
}
export interface PointsFreeze {
    id: string;
    accountId: string;
    amount: number;
    reason: string;
    scene?: SceneCode;
    referenceId?: string;
    status: FreezeStatus;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface PointsAccountResponse {
    id: string;
    balance: number;
    totalEarned: number;
    totalSpent: number;
    frozenAmount: number;
    availableBalance: number;
}
export interface PointsTransactionListResponse {
    transactions: PointsTransaction[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
export interface PointsFreezeListResponse {
    freezes: PointsFreeze[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
export interface CreatePointsTransactionRequest {
    amount: number;
    type: PointsTransactionType;
    description?: string;
    scene?: SceneCode;
    referenceId?: string;
    metadata?: Record<string, unknown>;
}
export interface CreatePointsFreezeRequest {
    amount: number;
    reason: string;
    scene?: SceneCode;
    referenceId?: string;
    expiresAt?: string;
}
export interface PointsOperationResult {
    success: boolean;
    transaction?: PointsTransaction;
    freeze?: PointsFreeze;
    error?: string;
}
export interface PointsRuleConfig {
    code: string;
    name: string;
    description: string;
    points: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    cooldownMinutes?: number;
    enabled: boolean;
    scene?: SceneCode;
}
export interface PointsStatistics {
    totalEarned: number;
    totalSpent: number;
    currentBalance: number;
    frozenAmount: number;
    dailyEarned: number;
    weeklyEarned: number;
    dailySpent: number;
    weeklySpent: number;
}
export interface PointsTransactionStatsByType {
    type: PointsTransactionType;
    count: number;
    totalAmount: number;
}
export interface PointsStatsResponse {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    frozenAmount: number;
    availableBalance: number;
    byType: PointsTransactionStatsByType[];
    recentStats: {
        dailyEarned: number;
        weeklyEarned: number;
        dailySpent: number;
        weeklySpent: number;
    };
}
export declare enum ExportFormat {
    CSV = "csv",
    XLSX = "xlsx"
}
export declare enum PersonalityTrait {
    INTROVERTED = "INTROVERTED",
    EXTROVERTED = "EXTROVERTED",
    AMBIVERT = "AMBIVERT",
    OPTIMISTIC = "OPTIMISTIC",
    RATIONAL = "RATIONAL",
    EMOTIONAL = "EMOTIONAL",
    PRACTICAL = "PRACTICAL",
    CREATIVE = "CREATIVE",
    ADVENTUROUS = "ADVENTUROUS",
    STABLE = "STABLE",
    HUMOROUS = "HUMOROUS",
    GENTLE = "GENTLE",
    INDEPENDENT = "INDEPENDENT",
    DEPENDABLE = "DEPENDABLE"
}
export declare enum InterestCategory {
    SPORTS = "SPORTS",
    MUSIC = "MUSIC",
    READING = "READING",
    TRAVEL = "TRAVEL",
    FOOD = "FOOD",
    MOVIES = "MOVIES",
    GAMING = "GAMING",
    PHOTOGRAPHY = "PHOTOGRAPHY",
    ARTS = "ARTS",
    TECH = "TECH",
    FASHION = "FASHION",
    OUTDOOR = "OUTDOOR",
    PETS = "PETS",
    COOKING = "COOKING",
    DANCING = "DANCING",
    FITNESS = "FITNESS"
}
export declare enum DatingPurpose {
    SERIOUS_RELATIONSHIP = "SERIOUS_RELATIONSHIP",
    MARRIAGE = "MARRIAGE",
    CASUAL_DATING = "CASUAL_DATING",
    FRIENDSHIP_FIRST = "FRIENDSHIP_FIRST",
    COMPANIONSHIP = "COMPANIONSHIP",
    NOT_SURE = "NOT_SURE"
}
export declare enum HandoffStatus {
    AGENT_ACTIVE = "AGENT_ACTIVE",
    HUMAN_ACTIVE = "HUMAN_ACTIVE",
    PENDING_TAKEOVER = "PENDING_TAKEOVER",
    PENDING_HANDOFF = "PENDING_HANDOFF",
    TIMEOUT = "TIMEOUT",
    CANCELLED = "CANCELLED"
}
export declare enum HandoffRequestStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    TIMEOUT = "TIMEOUT",
    CANCELLED = "CANCELLED"
}
export declare enum SenderType {
    AGENT = "AGENT",
    HUMAN = "HUMAN",
    SYSTEM = "SYSTEM",
    TRANSITION = "TRANSITION"
}
export declare enum HandoffSocketEvents {
    REQUEST_TAKEOVER = "handoff:request_takeover",
    REQUEST_HANDOFF = "handoff:request_handoff",
    CONFIRM_HANDOFF = "handoff:confirm",
    REJECT_HANDOFF = "handoff:reject",
    CANCEL_HANDOFF = "handoff:cancel",
    HANDOFF_REQUESTED = "handoff:requested",
    HANDOFF_CONFIRMED = "handoff:confirmed",
    HANDOFF_REJECTED = "handoff:rejected",
    HANDOFF_TIMEOUT = "handoff:timeout",
    HANDOFF_CANCELLED = "handoff:cancelled",
    HANDOFF_STATUS_CHANGED = "handoff:status_changed",
    HANDOFF_ERROR = "handoff:error"
}
export interface HandoffRequest {
    id: string;
    conversationId: string;
    requestType: 'takeover' | 'handoff';
    requestedBy: string;
    requestedAt: string;
    status: HandoffRequestStatus;
    timeoutAt: string;
    reason?: string;
}
export declare enum AgentAdRole {
    CONSUMER = "CONSUMER",
    MERCHANT = "MERCHANT"
}
export declare enum HandoffErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    RATE_LIMITED = "RATE_LIMITED",
    INVALID_STATUS = "INVALID_STATUS",
    REQUEST_NOT_FOUND = "REQUEST_NOT_FOUND",
    TIMEOUT = "TIMEOUT",
    ALREADY_PENDING = "ALREADY_PENDING",
    FORCE_TAKEOVER_DISABLED = "FORCE_TAKEOVER_DISABLED"
}
export interface HandoffConfig {
    allowedRoles: string[];
    maxHandoffsPerHour: number;
    minHandoffIntervalSeconds: number;
    allowForcedTakeover: boolean;
    allowedForcedTakeoverRoles: string[];
    auditLogEnabled: boolean;
    requestTimeoutSeconds: number;
}
export declare const DEFAULT_HANDOFF_CONFIG: HandoffConfig;
export interface HandoffAuditLog {
    id: string;
    conversationId: string;
    action: 'REQUEST_TAKEOVER' | 'REQUEST_HANDOFF' | 'CONFIRM_TAKEOVER' | 'CONFIRM_HANDOFF' | 'REJECT' | 'TIMEOUT' | 'CANCEL' | 'FORCE_TAKEOVER';
    performedBy: string;
    performedAt: string;
    metadata?: Record<string, any>;
}
export declare enum VisibilityLevel {
    PUBLIC = "PUBLIC",
    PRIVATE = "PRIVATE",
    MATCHED_ONLY = "MATCHED_ONLY",
    VERIFIED_ONLY = "VERIFIED_ONLY"
}
export interface Location {
    province: string;
    provinceName: string;
    city: string;
    cityName: string;
    district?: string;
    districtName?: string;
    address?: string;
    postalCode?: string;
}
export interface GeoCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
}
export interface DistanceFilter {
    center: GeoCoordinates;
    radiusKm: number;
}
export interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}
export interface GeoFence {
    id: string;
    name: string;
    description?: string;
    geometry: {
        type: 'Polygon';
        coordinates: Array<Array<[number, number]>>;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface GeoFenceCheckResult {
    inside: boolean;
    distanceMeters?: number;
    nearestPoint?: GeoCoordinates;
}
export interface LocationFilter {
    province?: string;
    city?: string;
    district?: string;
    withinRadius?: DistanceFilter;
    withinBounds?: BoundingBox;
    withinFence?: string;
}
export interface LocationSearchRequest {
    query?: string;
    filter?: LocationFilter;
    page?: number;
    limit?: number;
}
export interface LocationSearchResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}
export interface DistanceResult {
    distanceKm: number;
    distanceMiles: number;
    distanceMeters: number;
}
export declare const EARTH_RADIUS_KM = 6371;
export declare function calculateDistance(coord1: GeoCoordinates, coord2: GeoCoordinates): DistanceResult;
export declare function isWithinRadius(point: GeoCoordinates, center: GeoCoordinates, radiusKm: number): boolean;
export declare function isValidCoordinates(coords: GeoCoordinates): boolean;
export declare function createBoundingBox(center: GeoCoordinates, radiusKm: number): BoundingBox;
export declare function isWithinBoundingBox(point: GeoCoordinates, box: BoundingBox): boolean;
export declare function isPointInPolygon(point: GeoCoordinates, polygon: {
    coordinates: Array<Array<[number, number]>>;
}): boolean;
export declare function calculatePolygonCentroid(polygon: {
    coordinates: Array<Array<[number, number]>>;
}): GeoCoordinates;
export declare function toGeoJSONPoint(coords: GeoCoordinates): {
    type: 'Point';
    coordinates: [number, number];
};
export declare function formatDistance(distanceMeters: number): string;
export declare function checkGeoFence(_point: GeoCoordinates, _fenceId: string): GeoFenceCheckResult;
export declare function findContainingGeoFences(_point: GeoCoordinates): GeoFence[];
export declare function getGeoFencesWithinDistance(_point: GeoCoordinates, _maxDistanceKm: number): Array<{
    fence: GeoFence;
    distanceKm: number;
}>;
export declare enum AgeRange {
    UNDER_18 = "UNDER_18",
    AGE_18_25 = "AGE_18_25",
    AGE_26_30 = "AGE_26_30",
    AGE_31_35 = "AGE_31_35",
    AGE_36_40 = "AGE_36_40",
    AGE_41_45 = "AGE_41_45",
    AGE_46_50 = "AGE_46_50",
    AGE_51_60 = "AGE_51_60",
    OVER_60 = "OVER_60"
}
export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER",
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"
}
export declare enum EducationLevel {
    HIGH_SCHOOL = "HIGH_SCHOOL",
    ASSOCIATE = "ASSOCIATE",
    BACHELOR = "BACHELOR",
    MASTER = "MASTER",
    DOCTORATE = "DOCTORATE",
    OTHER = "OTHER",
    NO_REQUIREMENT = "NO_REQUIREMENT"
}
export interface ProfileLocation {
    province: string;
    city: string;
    district?: string;
    latitude?: number;
    longitude?: number;
}
export interface L1Profile {
    age?: AgeRange;
    gender?: Gender;
    location?: ProfileLocation;
    occupation?: string;
    education?: EducationLevel;
    [key: string]: any;
}
export declare const L1_FIELD_WEIGHTS: Record<keyof L1Profile, number>;
export declare const L1_FIELD_LABELS: Record<keyof L1Profile, string>;
export declare const AGE_RANGE_LABELS: Record<AgeRange, string>;
export declare const GENDER_LABELS: Record<Gender, string>;
export declare const EDUCATION_LABELS: Record<EducationLevel, string>;
export interface L2Profile {
    description?: string;
    requirements?: string[];
    capabilities?: string[];
    preferences?: string[];
    constraints?: string[];
    [key: string]: any;
}
export interface L3Profile {
    description: string;
    mediaUrls?: string[];
}
export interface AgentProfileData {
    l1?: L1Profile;
    l2?: L2Profile;
    l3?: L3Profile;
}
export interface ProfileCompletionResult {
    l1Percentage: number;
    l1FilledFields: number;
    l1TotalFields: number;
    l1MissingFields: (keyof L1Profile)[];
    l1WeightedScore: number;
}
export interface ProfileValidationError {
    field: string;
    message: string;
    code: string;
}
export interface ProfileValidationResult {
    valid: boolean;
    errors: ProfileValidationError[];
}
export interface UpdateL1ProfileRequest {
    age?: AgeRange;
    gender?: Gender;
    location?: ProfileLocation;
    occupation?: string;
    education?: EducationLevel;
}
export interface UpdateL2ProfileRequest {
    description?: string;
    requirements?: string[];
    capabilities?: string[];
    preferences?: string[];
    constraints?: string[];
}
export interface UpdateL3ProfileRequest {
    description: string;
    mediaUrls?: string[];
}
export interface AgentProfileData {
    l1?: L1Profile;
    l2?: L2Profile;
    l3?: L3Profile;
}
export interface ProfileValidationError {
    field: string;
    message: string;
    code: string;
}
export interface ProfileValidationResult {
    valid: boolean;
    errors: ProfileValidationError[];
}
export interface AgentProfile {
    id: string;
    agentId: string;
    sceneId?: string;
    l1Data: L1Profile | null;
    l2Data: L2Profile | null;
    l3Description: string | null;
    sceneConfig: Record<string, unknown> | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface L2SchemaField {
    id: string;
    type: string;
    label: string;
    description?: string;
    required?: boolean;
    options?: Array<{
        value: string;
        label: string;
    }>;
    min?: number;
    max?: number;
    step?: number;
    minLength?: number;
    maxLength?: number;
    maxItems?: number;
    unit?: string;
    placeholder?: string;
    defaultValue?: unknown;
    dependsOn?: string;
    showWhen?: {
        field: string;
        operator: string;
        value: unknown;
    };
    validation?: {
        pattern?: string;
        message?: string;
    };
}
export interface L2Schema {
    id: string;
    version: string;
    scene: string;
    role?: string;
    title: string;
    description?: string;
    fields: L2SchemaField[];
    groups?: Array<{
        id: string;
        title: string;
        fields: string[];
    }>;
}
export declare const L2_SCHEMAS: Record<string, L2Schema>;
export declare function getL2Schema(_scene: string, _role?: string): L2Schema | undefined;
export declare function getAllL2Schemas(): L2Schema[];
export declare function getL2SchemaIds(): string[];
export declare enum AgeRangePreference {
    UNDER_20 = "UNDER_20",
    AGE_20_25 = "AGE_20_25",
    AGE_26_30 = "AGE_26_30",
    AGE_31_35 = "AGE_31_35",
    AGE_36_40 = "AGE_36_40",
    AGE_41_50 = "AGE_41_50",
    OVER_50 = "OVER_50",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum HeightRange {
    BELOW_150 = "BELOW_150",
    HEIGHT_150_160 = "HEIGHT_150_160",
    HEIGHT_160_170 = "HEIGHT_160_170",
    HEIGHT_170_180 = "HEIGHT_170_180",
    HEIGHT_180_190 = "HEIGHT_180_190",
    ABOVE_190 = "ABOVE_190",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum IncomeRange {
    BELOW_5K = "BELOW_5K",
    INCOME_5K_10K = "INCOME_5K_10K",
    INCOME_10K_20K = "INCOME_10K_20K",
    INCOME_20K_50K = "INCOME_20K_50K",
    ABOVE_50K = "ABOVE_50K",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum MBTIType {
    INTJ = "INTJ",
    INTP = "INTP",
    ENTJ = "ENTJ",
    ENTP = "ENTP",
    INFJ = "INFJ",
    INFP = "INFP",
    ENFJ = "ENFJ",
    ENFP = "ENFP",
    ISTJ = "ISTJ",
    ISFJ = "ISFJ",
    ESTJ = "ESTJ",
    ESFJ = "ESFJ",
    ISTP = "ISTP",
    ISFP = "ISFP",
    ESTP = "ESTP",
    ESFP = "ESFP",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum SleepSchedule {
    EARLY_BIRD = "EARLY_BIRD",
    NIGHT_OWL = "NIGHT_OWL",
    FLEXIBLE = "FLEXIBLE",
    REGULAR = "REGULAR"
}
export declare enum SmokingHabit {
    NEVER = "NEVER",
    OCCASIONALLY = "OCCASIONALLY",
    REGULARLY = "REGULARLY",
    QUITTING = "QUITTING",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum DrinkingHabit {
    NEVER = "NEVER",
    SOCIALLY = "SOCIALLY",
    REGULARLY = "REGULARLY",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum PetPreference {
    DOGS = "DOGS",
    CATS = "CATS",
    OTHER = "OTHER",
    NO_PETS = "NO_PETS",
    ALLERGIC = "ALLERGIC",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum ExerciseFrequency {
    NEVER = "NEVER",
    OCCASIONALLY = "OCCASIONALLY",
    REGULARLY = "REGULARLY",
    DAILY = "DAILY",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum DietPreference {
    OMNIVORE = "OMNIVORE",
    VEGETARIAN = "VEGETARIAN",
    VEGAN = "VEGAN",
    HALAL = "HALAL",
    KOSHER = "KOSHER",
    GLUTEN_FREE = "GLUTEN_FREE",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export declare enum RelationshipPace {
    TAKE_IT_SLOW = "TAKE_IT_SLOW",
    MODERATE = "MODERATE",
    READY_TO_COMMIT = "READY_TO_COMMIT"
}
export declare enum LivingArrangement {
    LIVE_ALONE = "LIVE_ALONE",
    WITH_FAMILY = "WITH_FAMILY",
    WITH_ROOMMATES = "WITH_ROOMMATES",
    OPEN_TO_MOVE = "OPEN_TO_MOVE"
}
export declare enum FamilyPlan {
    WANT_CHILDREN = "WANT_CHILDREN",
    DO_NOT_WANT_CHILDREN = "DO_NOT_WANT_CHILDREN",
    OPEN_MINDED = "OPEN_MINDED",
    HAVE_CHILDREN = "HAVE_CHILDREN",
    NOT_SURE = "NOT_SURE"
}
export interface BasicConditions {
    ageRange?: AgeRangePreference;
    heightRange?: HeightRange;
    education?: EducationPreference;
    income?: IncomeRange;
    location?: LocationPreference;
    hasPhoto?: boolean;
    isVerified?: boolean;
}
export interface LocationPreference {
    province?: string;
    city?: string;
    district?: string;
    radiusKm?: number;
    sameCity?: boolean;
    sameProvince?: boolean;
}
export interface PersonalityPreferences {
    mbti?: MBTIType[];
    traits?: PersonalityTrait[];
    preferredTraits?: PersonalityTrait[];
    dislikedTraits?: PersonalityTrait[];
}
export interface Interest {
    category: InterestCategory;
    name: string;
    level?: 'casual' | 'regular' | 'passionate';
}
export interface InterestPreferences {
    interests: Interest[];
    customInterests?: string[];
    preferredInPartner?: InterestCategory[];
    sharedInterests?: InterestCategory[];
}
export interface Lifestyle {
    sleepSchedule?: SleepSchedule;
    smoking?: SmokingHabit;
    drinking?: DrinkingHabit;
    pets?: PetPreference;
    exercise?: ExerciseFrequency;
    diet?: DietPreference;
    workLifeBalance?: 'work_focused' | 'balanced' | 'life_focused';
    socialFrequency?: 'homebody' | 'moderate' | 'social_butterfly';
}
export interface RelationshipExpectations {
    purpose: DatingPurpose;
    pace?: RelationshipPace;
    living?: LivingArrangement;
    familyPlan?: FamilyPlan;
    marriageTimeline?: 'within_1_year' | '1_3_years' | '3_5_years' | 'no_rush';
    longDistance?: 'acceptable' | 'not_preferred' | 'deal_breaker';
}
export interface FieldVisibility {
    basicInfo?: VisibilityLevel;
    photos?: VisibilityLevel;
    income?: VisibilityLevel;
    location?: VisibilityLevel;
    contactInfo?: VisibilityLevel;
    personalDetails?: VisibilityLevel;
}
export interface PrivacySettings {
    profileVisibility: VisibilityLevel;
    fieldVisibility: FieldVisibility;
    disclosureStages?: Array<{
        stage: string;
        fields: string[];
    }>;
    allowScreenshot?: boolean;
    showOnlineStatus?: boolean;
    hideFromSearch?: boolean;
}
export interface DatingProfile {
    id: string;
    agentId: string;
    userId: string;
    basicConditions?: BasicConditions;
    personality?: PersonalityPreferences;
    interests?: InterestPreferences;
    lifestyle?: Lifestyle;
    expectations?: RelationshipExpectations;
    description?: string;
    aiExtractedData?: Record<string, any>;
    aiExtractionConfidence?: number;
    privacySettings: PrivacySettings;
    completenessScore?: number;
    qualityScore?: number;
    isActive: boolean;
    isComplete: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface SimilarityWeights {
    basicConditions: number;
    personality: number;
    interests: number;
    lifestyle: number;
    expectations: number;
    complementary: number;
    geoProximity: number;
}
export declare const DEFAULT_SIMILARITY_WEIGHTS: SimilarityWeights;
export declare function calculateDatingSimilarity(_profileA: DatingProfile, _profileB: DatingProfile, _weights?: Partial<SimilarityWeights>): {
    totalScore: number;
    dimensions: {
        dimension: string;
        score: number;
        weight: number;
        weightedScore: number;
        details: any[];
    }[];
    highlights: string[];
    warnings: any[];
};
export declare const DATING_AGE_RANGE_LABELS: Record<string, string>;
export declare const HEIGHT_RANGE_LABELS: Record<string, string>;
export declare const DATING_EDUCATION_LABELS: Record<string, string>;
export declare const INCOME_LABELS: Record<string, string>;
export declare const DATING_PURPOSE_LABELS: Record<string, string>;
export declare const VISIBILITY_LABELS: Record<string, string>;
export declare enum EducationPreference {
    HIGH_SCHOOL = "HIGH_SCHOOL",
    ASSOCIATE = "ASSOCIATE",
    BACHELOR = "BACHELOR",
    MASTER = "MASTER",
    DOCTORATE = "DOCTORATE",
    NO_PREFERENCE = "NO_PREFERENCE"
}
export interface CreateDatingProfileRequest {
    agentId: string;
    basicConditions?: BasicConditions;
    personality?: PersonalityPreferences;
    interests?: InterestPreferences;
    lifestyle?: Lifestyle;
    expectations?: RelationshipExpectations;
    description?: string;
    privacySettings?: Partial<PrivacySettings>;
}
export interface UpdateDatingProfileRequest {
    basicConditions?: BasicConditions;
    personality?: PersonalityPreferences;
    interests?: InterestPreferences;
    lifestyle?: Lifestyle;
    expectations?: RelationshipExpectations;
    description?: string;
    privacySettings?: Partial<PrivacySettings>;
}
export interface DatingProfileResponse {
    profile: DatingProfile;
    quality?: any;
    completion: {
        percentage: number;
        filledSections: number;
        totalSections: number;
    };
}
export interface ProfileQualityMetrics {
    completenessScore: number;
    richnessScore: number;
    matchPotentialScore: number;
    missingCriticalFields: string[];
    suggestions: string[];
}
export interface ProfileQualityResult {
    overallScore: number;
    metrics: ProfileQualityMetrics;
    recommendations: Array<{
        field: string;
        priority: string;
        suggestion: string;
    }>;
}
export interface AIExtractedPreference {
    category: string;
    value: any;
    confidence: number;
    source: 'explicit' | 'implicit' | 'inferred';
}
export interface AIExtractionResult {
    basicConditions?: Partial<BasicConditions>;
    personality?: Partial<PersonalityPreferences>;
    interests?: Partial<InterestPreferences>;
    lifestyle?: Partial<Lifestyle>;
    expectations?: Partial<RelationshipExpectations>;
    extracted: AIExtractedPreference[];
    confidence: number;
    suggestions: string[];
}
export interface ExtractFromDescriptionRequest {
    description: string;
    currentProfile?: Partial<DatingProfile>;
}
export interface ExtractFromDescriptionResponse {
    extracted: AIExtractionResult;
    profile: Partial<DatingProfile>;
    confidence: number;
}
export {};
//# sourceMappingURL=shared.d.ts.map