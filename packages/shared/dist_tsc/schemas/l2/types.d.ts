/**
 * L2 Schema Field Types
 * L2 结构化信息字段类型定义
 */
export declare enum L2FieldType {
    ENUM = "enum",// 单选枚举
    MULTI_SELECT = "multi_select",// 多选
    RANGE = "range",// 范围选择 (数值范围)
    BOOLEAN = "boolean",// 布尔值
    TEXT = "text",// 短文本
    LONG_TEXT = "long_text",// 长文本
    NUMBER = "number",// 数字
    DATE = "date",// 日期
    TIME = "time",// 时间
    DATETIME = "datetime",// 日期时间
    LOCATION = "location",// 地理位置
    TAGS = "tags",// 标签输入
    IMAGE = "image",// 图片
    FILE = "file"
}
/**
 * L2 Schema Field Definition
 */
export interface L2SchemaField {
    id: string;
    type: L2FieldType;
    label: string;
    description?: string;
    required?: boolean;
    options?: L2FieldOption[];
    min?: number;
    max?: number;
    step?: number;
    minLength?: number;
    maxLength?: number;
    maxItems?: number;
    unit?: string;
    placeholder?: string;
    defaultValue?: any;
    dependsOn?: string;
    showWhen?: {
        field: string;
        operator: 'eq' | 'neq' | 'in' | 'contains';
        value: any;
    };
    validation?: {
        pattern?: string;
        message?: string;
    };
}
/**
 * Field Option
 */
export interface L2FieldOption {
    value: string;
    label: string;
    description?: string;
    icon?: string;
    color?: string;
    parent?: string;
}
/**
 * L2 Schema Definition
 */
export interface L2Schema {
    id: string;
    version: string;
    scene: string;
    role?: string;
    title: string;
    description?: string;
    fields: L2SchemaField[];
    groups?: L2FieldGroup[];
    steps?: L2Step[];
}
/**
 * Field Group
 */
export interface L2FieldGroup {
    id: string;
    title: string;
    description?: string;
    fields: string[];
}
/**
 * Form Step
 */
export interface L2Step {
    id: string;
    title: string;
    description?: string;
    fields: string[];
}
/**
 * L2 Data Value Types
 */
export type L2FieldValue = string | number | boolean | string[] | {
    min: number;
    max: number;
} | null | undefined;
/**
 * L2 Data Record
 */
export interface L2Data {
    [fieldId: string]: L2FieldValue;
}
/**
 * Validation Error
 */
export interface L2ValidationError {
    field: string;
    message: string;
    code: string;
}
/**
 * Validation Result
 */
export interface L2ValidationResult {
    valid: boolean;
    errors: L2ValidationError[];
}
//# sourceMappingURL=types.d.ts.map