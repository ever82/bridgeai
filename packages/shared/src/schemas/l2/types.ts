/**
 * L2 Schema Field Types
 * L2 结构化信息字段类型定义
 */

export enum L2FieldType {
  ENUM = 'enum',           // 单选枚举
  MULTI_SELECT = 'multi_select',  // 多选
  RANGE = 'range',         // 范围选择 (数值范围)
  BOOLEAN = 'boolean',     // 布尔值
  TEXT = 'text',           // 短文本
  LONG_TEXT = 'long_text', // 长文本
  NUMBER = 'number',       // 数字
  DATE = 'date',           // 日期
  TIME = 'time',           // 时间
  DATETIME = 'datetime',   // 日期时间
}

/**
 * L2 Schema Field Definition
 */
export interface L2SchemaField {
  id: string;                    // 字段唯一标识
  type: L2FieldType;             // 字段类型
  label: string;                 // 显示标签
  description?: string;          // 字段描述
  required?: boolean;            // 是否必填
  options?: L2FieldOption[];     // 选项 (用于 enum/multi_select)
  min?: number;                  // 最小值 (用于 range/number)
  max?: number;                  // 最大值 (用于 range/number)
  step?: number;                 // 步长 (用于 range)
  minLength?: number;            // 最小长度 (用于 text)
  maxLength?: number;            // 最大长度 (用于 text)
  placeholder?: string;          // 占位文本
  defaultValue?: any;            // 默认值
  dependsOn?: string;            // 依赖字段ID
  showWhen?: {                   // 显示条件
    field: string;
    operator: 'eq' | 'neq' | 'in' | 'contains';
    value: any;
  };
  validation?: {                 // 验证规则
    pattern?: string;            // 正则表达式
    message?: string;            // 错误消息
  };
}

/**
 * Field Option
 */
export interface L2FieldOption {
  value: string;                 // 选项值
  label: string;                 // 显示标签
  description?: string;          // 选项描述
  icon?: string;                 // 图标
  color?: string;                // 颜色
}

/**
 * L2 Schema Definition
 */
export interface L2Schema {
  id: string;                    // Schema ID
  version: string;               // Schema 版本
  scene: string;                 // 所属场景
  title: string;                 // Schema 标题
  description?: string;          // Schema 描述
  fields: L2SchemaField[];       // 字段列表
  groups?: L2FieldGroup[];       // 字段分组
  steps?: L2Step[];              // 步骤定义 (用于分步表单)
}

/**
 * Field Group
 */
export interface L2FieldGroup {
  id: string;
  title: string;
  description?: string;
  fields: string[];              // 字段ID列表
}

/**
 * Form Step
 */
export interface L2Step {
  id: string;
  title: string;
  description?: string;
  fields: string[];              // 字段ID列表
}

/**
 * L2 Data Value Types
 */
export type L2FieldValue =
  | string
  | number
  | boolean
  | string[]
  | { min: number; max: number }
  | null
  | undefined;

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
