import { DynamoDBService } from './services/dynamodb.service';
import { ResponseBuilder } from './services/response.service';

const dynamoDbService = new DynamoDBService();

export const main = async (event: any): Promise<any> => {
  console.log('getProductsList Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    const allProducts = await dynamoDbService.getAllProductsWithStock();
    return ResponseBuilder.success(allProducts);
  } catch (error) {
    console.error('Error in getProductsList:', error);
    return ResponseBuilder.internalServerError(
      'Failed to retrieve products',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
