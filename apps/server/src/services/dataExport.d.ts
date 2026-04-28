export interface DataExportRequest {
    userId: string;
    dataTypes: ('profile' | 'messages' | 'transactions' | 'logs')[];
    format: 'json' | 'csv';
    encrypted: boolean;
}
export interface DataExportResult {
    exportId: string;
    userId: string;
    exportedAt: Date;
    expiresAt: Date;
    downloadUrl: string;
    checksum: string;
    encrypted: boolean;
}
declare class DataExportService {
    private exportLog;
    exportUserData(request: DataExportRequest): Promise<DataExportResult>;
    private gatherUserData;
    private getProfileData;
    private getMessageData;
    private getTransactionData;
    private getLogData;
    private convertToCSV;
    private logExport;
    getExportHistory(userId: string): DataExportResult[];
    validateExportAccess(userId: string, role: string): boolean;
}
export declare const dataExportService: DataExportService;
export {};
//# sourceMappingURL=dataExport.d.ts.map