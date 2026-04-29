/**
 * VisionShare Photo Types
 * Shared types for photo viewing and payment functionality
 */
/** Photo status enum */
export var PhotoStatus;
(function (PhotoStatus) {
    PhotoStatus["UPLOADING"] = "uploading";
    PhotoStatus["PROCESSING"] = "processing";
    PhotoStatus["READY"] = "ready";
    PhotoStatus["LOCKED"] = "locked";
    PhotoStatus["UNLOCKED"] = "unlocked";
    PhotoStatus["DELETED"] = "deleted";
})(PhotoStatus || (PhotoStatus = {}));
//# sourceMappingURL=photo.types.js.map