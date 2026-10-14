import { ErrorCode, ProblemDetail } from '@pawnest/shared';

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode | string;
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(status: number, code: ErrorCode | string, message: string, errors?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  toProblemDetail(typeBase = 'https://pawnest.example/errors'): ProblemDetail {
    return {
      type: `${typeBase}/${this.code.toLowerCase()}`,
      title: this.name,
      status: this.status,
      code: this.code,
      detail: this.message,
      errors: this.errors,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, ErrorCode.NOT_FOUND, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, ErrorCode.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(403, ErrorCode.FORBIDDEN, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors?: Array<{ field: string; message: string }>) {
    super(422, ErrorCode.VALIDATION_FAILED, message, errors);
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCode | string = ErrorCode.CONFLICT, message = 'Conflict detected') {
    super(409, code, message);
  }
}

export class VaccinesRequiredError extends AppError {
  constructor(message = 'Pet vaccination requirements not met for boarding', errors?: Array<{ field: string; message: string }>) {
    super(422, ErrorCode.VACCINES_REQUIRED, message, errors);
  }
}

