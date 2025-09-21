import { main } from '../getProductsList';

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

describe('getProductsList Lambda Handler', () => {
  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  it('should return all products successfully', async () => {
    const mockEvent = {
      httpMethod: 'GET',
      path: '/products'
    };

    const result = await main(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');

    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody).toHaveLength(1);
    expect(responseBody[0]).toHaveProperty('id', 'test-id-1');
  });

  it('should log the incoming event', async () => {
    const mockEvent = { httpMethod: 'GET', path: '/products' };

    await main(mockEvent);

    expect(console.log).toHaveBeenCalledWith(
      'getProductsList Lambda invoked with event:',
      JSON.stringify(mockEvent, null, 2)
    );
  });
});
