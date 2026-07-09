import { StatusCodes } from "http-status-codes";

export class APIError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export class NotFoundError extends APIError {
  constructor(path: string) {
    super(StatusCodes.NOT_FOUND, `The requested path ${path} was not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BadRequestError extends APIError {
  constructor(message: string) {
    super(StatusCodes.BAD_REQUEST, message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
