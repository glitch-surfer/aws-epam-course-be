import { products } from './products-data';
import { ProductService } from './services/product.service';
import { ResponseBuilder } from './services/response.service';

const productService = new ProductService(products);

export const main = async (event: any): Promise<any> => {
  console.log('getProductsById Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    const productId = event.pathParameters?.productId;

    // Validate product ID
    if (!productService.validateProductId(productId)) {
      return ResponseBuilder.badRequest('Product ID is required and must be valid');
    }

    // Get product by ID
    const product = productService.getProductById(productId);

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
