import { products } from './products-data';

export const main = async (event: any): Promise<any> => {
  console.log('Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error('Error in getProductsList:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
