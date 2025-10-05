import { main } from '../importProductsFile';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;
const mockPutObjectCommand = PutObjectCommand as jest.MockedClass<typeof PutObjectCommand>;

describe('importProductsFile Lambda Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      BUCKET_NAME: 'test-bucket',
      AWS_REGION: 'us-east-1'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return a signed URL when valid fileName is provided', async () => {
    const mockSignedUrl = 'https://test-bucket.s3.amazonaws.com/uploaded/test.csv?signed-url-params';
    mockGetSignedUrl.mockResolvedValue(mockSignedUrl);

    const event = {
      queryStringParameters: {
        name: 'test.csv'
      }
    };

    const result = await main(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ url: mockSignedUrl });
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('should return 400 when fileName is missing', async () => {
    const event = {
      queryStringParameters: {}
    };

    const result = await main(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Missing required query parameter: name'
    });
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('should return 400 when queryStringParameters is null', async () => {
    const event = {
      queryStringParameters: null
    };

    const result = await main(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Missing required query parameter: name'
    });
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('should return 500 when BUCKET_NAME environment variable is not set', async () => {
    delete process.env.BUCKET_NAME;

    const event = {
      queryStringParameters: {
        name: 'test.csv'
      }
    };

    const result = await main(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Server configuration error'
    });
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('should return 500 when S3 operation fails', async () => {
    const errorMessage = 'S3 operation failed';
    mockGetSignedUrl.mockRejectedValue(new Error(errorMessage));

    const event = {
      queryStringParameters: {
        name: 'test.csv'
      }
    };

    const result = await main(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Failed to generate signed URL',
      error: errorMessage
    });
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('should generate correct S3 key with uploaded/ prefix', async () => {
    const mockSignedUrl = 'https://test-bucket.s3.amazonaws.com/uploaded/products.csv?signed-url-params';
    mockGetSignedUrl.mockResolvedValue(mockSignedUrl);

    const event = {
      queryStringParameters: {
        name: 'products.csv'
      }
    };

    await main(event);

    // Check that PutObjectCommand was called with correct parameters
    expect(mockPutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'uploaded/products.csv',
      ContentType: 'text/csv'
    });

    // Check that getSignedUrl was called with correct parameters
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(S3Client),
        expect.any(PutObjectCommand),
        { expiresIn: 300 }
    );

    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });
});