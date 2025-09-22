import { DynamoDBService } from './services/dynamodb.service';
import { ResponseBuilder } from './services/response.service';

const dynamoDbService = new DynamoDBService();

interface CreateProductRequest {
  title?: string;
  description?: string;
  price?: number;
  count?: number;
}

export const main = async (event: any): Promise<any> => {
  console.log('createProduct Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    let requestBody: CreateProductRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return ResponseBuilder.badRequest('Invalid JSON in request body');
    }

    // Validate required fields
    const { title, description, price, count } = requestBody;

    if (!title || typeof title !== 'string') {
      return ResponseBuilder.badRequest('Title is required and must be a string');
    }

    if (description !== undefined && typeof description !== 'string') {
      return ResponseBuilder.badRequest('Description must be a string');
    }

    if (!price || typeof price !== 'number' || price <= 0) {
      return ResponseBuilder.badRequest('Price is required and must be a positive number');
    }

    if (count === undefined || typeof count !== 'number' || count < 0) {
      return ResponseBuilder.badRequest('Count is required and must be a non-negative number');
    }

    // Create product in DynamoDB
    const createdProduct = await dynamoDbService.createProduct({
      title,
      description: description || '',
      price,
      count,
    });

    return ResponseBuilder.success(createdProduct, 201);
  } catch (error) {
    console.error('Error in createProduct:', error);
    return ResponseBuilder.internalServerError(
      'Failed to create product',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
