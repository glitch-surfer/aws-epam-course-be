import { products } from './products-data';

export const main = async (event: any): Promise<any> => {
  console.log('Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Product ID is required' }),
      };
    }

    const product = products.find(p => p.id === productId);

    if (!product) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error('Error in getProductsById:', error);
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
