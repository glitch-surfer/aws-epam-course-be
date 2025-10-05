import { DynamoDBService } from './services/dynamodb.service';
import { ResponseBuilder } from '../shared/helpers/response.service';

const dynamoDbService = new DynamoDBService();

export const main = async (event: any): Promise<any> => {
  console.log('getProductsById Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    const productId = event.pathParameters?.productId;

    // Validate product ID
    if (!productId || typeof productId !== 'string') {
      return ResponseBuilder.badRequest('Product ID is required and must be valid');
    }

    // Get product by ID from DynamoDB
    const product = await dynamoDbService.getProductByIdWithStock(productId);

    if (!product) {
      return ResponseBuilder.notFound(`Product with ID '${productId}' not found`);
    }

    return ResponseBuilder.success(product);
  } catch (error) {
    console.error('Error in getProductsById:', error);
    return ResponseBuilder.internalServerError(
      'Failed to retrieve product',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
