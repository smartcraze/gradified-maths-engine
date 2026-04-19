export class ApiResponse<T = unknown> {
  public readonly success: boolean;

  public readonly message: string;
  public readonly data?: T;
  public readonly errors?: unknown;

  constructor(success: boolean, message: string, data?: T, errors?: unknown) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errors = errors;
  }

  static success<T>(message = "Success", data?: T) {
    return new ApiResponse<T>(true, message, data);
  }

  static error(message = "Something went wrong", errors?: unknown) {
    return new ApiResponse<null>(false, message, null, errors);
  }
}
