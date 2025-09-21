import { main } from '../getProductsById';

// Mock the products data
jest.mock('../products-data', () => ({
  products: [
    {
      id: "test-id-1",
      title: "Test Product 1",
      description: "Test Description 1",
      price: 10,
      count: 5
    }
  ]
}));

describe('getProductsById Lambda Handler', () => {
  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  it('should return product when valid ID is provided', async () => {
    const mockEvent = {
      pathParameters: {
        productId: 'test-id-1'
      },
      httpMethod: 'GET'
    };

    const result = await main(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('id', 'test-id-1');
    expect(responseBody).toHaveProperty('title', 'Test Product 1');
  });

  it('should return 404 when product is not found', async () => {
    const mockEvent = {
      pathParameters: {
        productId: 'non-existent-id'
      },
      httpMethod: 'GET'
    };

    const result = await main(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toMatchObject({
      message: "Product with ID 'non-existent-id' not found"
    });
  });

  it('should return 400 when product ID is missing', async () => {
    const mockEvent = {
      pathParameters: {},
      httpMethod: 'GET'
    };

    const result = await main(mockEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Product ID is required and must be valid'
    });
  });

  it('should return 400 when pathParameters is null', async () => {
    const mockEvent = {
      pathParameters: null,
      httpMethod: 'GET'
    };

    const result = await main(mockEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Product ID is required and must be valid'
    });
  });
});
