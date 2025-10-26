"use strict";
// Shared TypeScript interfaces for API responses and requests
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = void 0;
// Error codes enum for consistent error handling
var ErrorCodes;
(function (ErrorCodes) {
    // Authentication errors
    ErrorCodes["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCodes["FORBIDDEN"] = "FORBIDDEN";
    ErrorCodes["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCodes["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    // Validation errors
    ErrorCodes["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCodes["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCodes["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    ErrorCodes["INVALID_FILE_TYPE"] = "INVALID_FILE_TYPE";
    ErrorCodes["FILE_TOO_LARGE"] = "FILE_TOO_LARGE";
    // Resource errors
    ErrorCodes["NOT_FOUND"] = "NOT_FOUND";
    ErrorCodes["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    ErrorCodes["RESOURCE_LIMIT_EXCEEDED"] = "RESOURCE_LIMIT_EXCEEDED";
    // Rate limiting
    ErrorCodes["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCodes["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    ErrorCodes["CONCURRENT_LIMIT_EXCEEDED"] = "CONCURRENT_LIMIT_EXCEEDED";
    // Analysis errors
    ErrorCodes["ANALYSIS_FAILED"] = "ANALYSIS_FAILED";
    ErrorCodes["ANALYSIS_TIMEOUT"] = "ANALYSIS_TIMEOUT";
    ErrorCodes["INVALID_CONTRACT"] = "INVALID_CONTRACT";
    ErrorCodes["COMPILATION_ERROR"] = "COMPILATION_ERROR";
    // System errors
    ErrorCodes["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCodes["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCodes["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCodes["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
})(ErrorCodes || (exports.ErrorCodes = ErrorCodes = {}));
