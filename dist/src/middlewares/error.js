"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
const response_1 = require("../utils/response");
// Fix: Changed next type to any to avoid signature mismatch issues in the middleware chain
const errorHandler = (err, req, res, next) => {
    console.error(`[Server Error] ${err.stack}`);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    return response_1.ApiResponse.error(res, message, status, process.env.NODE_ENV === 'development' ? err.stack : null);
};
exports.errorHandler = errorHandler;
// Fix: Changed next to any and wrapped catch call to resolve "Argument of type 'NextFunction' is not assignable"
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=error.js.map