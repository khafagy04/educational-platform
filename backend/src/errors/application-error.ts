export type ErrorDetails = readonly {
  path: string;
  code: string;
  message: string;
}[];

export class ApplicationError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApplicationError {
  public constructor(message = 'بيانات الطلب غير صالحة', details?: ErrorDetails) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends ApplicationError {
  public constructor(message = 'يلزم تسجيل الدخول للمتابعة') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApplicationError {
  public constructor(message = 'لا تملك صلاحية تنفيذ هذا الإجراء') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends ApplicationError {
  public constructor(message = 'المورد المطلوب غير موجود') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends ApplicationError {
  public constructor(message = 'يتعارض الطلب مع الحالة الحالية للمورد') {
    super(409, 'CONFLICT', message);
  }
}

export class ServiceUnavailableError extends ApplicationError {
  public constructor(message = 'الخدمة غير متاحة مؤقتاً') {
    super(503, 'SERVICE_UNAVAILABLE', message);
  }
}
