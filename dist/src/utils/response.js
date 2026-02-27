"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    // Fix: Using any for res parameter to avoid 'status' property error in current TypeScript environment
    static success(res, data, message = "Success", status = 200) {
        return res.status(status).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        });
    }
    // Fix: Using any for res parameter to avoid 'status' property error in current TypeScript environment
    static error(res, message = "Internal Server Error", status = 500, errors = null) {
        return res.status(status).json({
            success: false,
            message,
            errors,
            timestamp: new Date().toISOString(),
        });
    }
}
exports.ApiResponse = ApiResponse;
//# sourceMappingURL=response.js.map