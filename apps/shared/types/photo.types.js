"use strict";
/**
 * VisionShare Photo Types
 * Shared types for photo viewing and payment functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoStatus = void 0;
/** Photo status enum */
var PhotoStatus;
(function (PhotoStatus) {
    PhotoStatus["UPLOADING"] = "uploading";
    PhotoStatus["PROCESSING"] = "processing";
    PhotoStatus["READY"] = "ready";
    PhotoStatus["LOCKED"] = "locked";
    PhotoStatus["UNLOCKED"] = "unlocked";
    PhotoStatus["DELETED"] = "deleted";
})(PhotoStatus || (exports.PhotoStatus = PhotoStatus = {}));
//# sourceMappingURL=photo.types.js.map