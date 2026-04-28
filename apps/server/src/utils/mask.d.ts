export interface MaskOptions {
    preserveStart?: number;
    preserveEnd?: number;
    maskChar?: string;
    maskLength?: number;
}
export declare function maskPhone(phone: string, options?: MaskOptions): string;
export declare function maskEmail(email: string, options?: MaskOptions): string;
export declare function maskIdCard(idCard: string, options?: MaskOptions): string;
export declare function maskBankCard(cardNo: string, options?: MaskOptions): string;
export declare function maskPassport(passport: string, options?: MaskOptions): string;
export declare function maskString(str: string, options?: MaskOptions): string;
export declare function maskObject<T extends Record<string, any>>(obj: T, sensitiveFields?: string[]): T;
export declare function maskJson(jsonString: string, sensitiveFields?: string[]): string;
export declare function maskLogMessage(message: string): string;
//# sourceMappingURL=mask.d.ts.map