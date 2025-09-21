import { ResponseBuilder } from '../services/response.service';

describe('ResponseBuilder', () => {
  describe('success', () => {
    it('should create successful response with default status code 200', () => {
      const data = { id: 1, name: 'Test' };
      const result = ResponseBuilder.success(data);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(result.body)).toEqual(data);
    });

    it('should create successful response with custom status code', () => {
      const data = { message: 'Created' };
      const result = ResponseBuilder.success(data, 201);

      expect(result.statusCode).toBe(201);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(result.body)).toEqual(data);
    });
  });

  describe('error', () => {
    it('should create error response with message and status code', () => {
      const result = ResponseBuilder.error('Something went wrong', 500);

      expect(result.statusCode).toBe(500);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(result.body)).toEqual({ message: 'Something went wrong' });
    });

    it('should create error response with message, status code and error details', () => {
      const result = ResponseBuilder.error('Something went wrong', 500, 'Detailed error');

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Something went wrong',
        error: 'Detailed error'
      });
    });
  });

  describe('badRequest', () => {
    it('should create 400 bad request response with default message', () => {
      const result = ResponseBuilder.badRequest();

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Bad Request' });
    });

    it('should create 400 bad request response with custom message', () => {
      const result = ResponseBuilder.badRequest('Invalid input');

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Invalid input' });
    });
  });

  describe('notFound', () => {
    it('should create 404 not found response with default message', () => {
      const result = ResponseBuilder.notFound();

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({ message: 'Resource not found' });
    });

    it('should create 404 not found response with custom message', () => {
      const result = ResponseBuilder.notFound('Product not found');

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({ message: 'Product not found' });
    });
  });

  describe('internalServerError', () => {
    it('should create 500 internal server error response with default message', () => {
      const result = ResponseBuilder.internalServerError();

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({ message: 'Internal server error' });
    });

    it('should create 500 internal server error response with custom message and error', () => {
      const result = ResponseBuilder.internalServerError('Database error', 'Connection timeout');

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Database error',
        error: 'Connection timeout'
      });
    });
  });
});
