export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export class ResponseBuilder {
  private static defaultHeaders = {
    'Content-Type': 'application/json',
  };

  static success<T>(data: T, statusCode: number = 200): ApiResponse {
    return {
      statusCode,
      headers: this.defaultHeaders,
      body: JSON.stringify(data),
    };
  }

  static error(message: string, statusCode: number = 500, error?: string): ApiResponse {
    const errorResponse: any = { message };
    if (error) {
      errorResponse.error = error;
    }

    return {
      statusCode,
      headers: this.defaultHeaders,
      body: JSON.stringify(errorResponse),
    };
  }

  static badRequest(message: string = 'Bad Request'): ApiResponse {
    return this.error(message, 400);
  }

  static notFound(message: string = 'Resource not found'): ApiResponse {
    return this.error(message, 404);
  }

  static internalServerError(message: string = 'Internal server error', error?: string): ApiResponse {
    return this.error(message, 500, error);
  }
}
