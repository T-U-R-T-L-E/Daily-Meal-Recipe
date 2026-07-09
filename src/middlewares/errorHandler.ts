import { Request, Response, NextFunction } from "express";
import { APIError } from "../utils/apiError";
import { StatusCodes } from "http-status-codes";

export class ErrorHandler {
  public static handle(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const statusCode = err instanceof APIError ? err.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
    const message = err.message || "Internal Server Error";

    console.error(`[Error Handler] Path: ${req.path}, Status: ${statusCode}, Message: ${message}`);
    
    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
