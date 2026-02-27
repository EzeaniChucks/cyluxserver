import { Response } from "express";

export class ApiResponse {
  // Fix: Using any for res parameter to avoid 'status' property error in current TypeScript environment
  static success(res: any, data: any, message = "Success", status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Fix: Using any for res parameter to avoid 'status' property error in current TypeScript environment
  static error(
    res: any,
    message = "Internal Server Error",
    status = 500,
    errors: any = null
  ) {
    return res.status(status).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
