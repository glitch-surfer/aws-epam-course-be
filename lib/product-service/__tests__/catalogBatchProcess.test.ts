import { main as catalogBatchProcess } from '../catalogBatchProcess';
import { SQSEvent, SQSRecord } from 'aws-lambda';

// Define mocks first so they can be referenced inside jest.mock factories
const mockDynamoDbPut = jest.fn();
const mockSnsPublish = jest.fn();
const mockRandomUUID = jest.fn().mockReturnValue('test-uuid-123');

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: mockDynamoDbPut,
    })),
  },
  SNS: jest.fn(() => ({
    publish: mockSnsPublish,
  })),
}));

jest.mock('crypto', () => ({
  randomUUID: mockRandomUUID,
}));

import { DynamoDB, SNS } from 'aws-sdk';
import { randomUUID } from 'crypto';

describe('catalogBatchProcess', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env = {
      ...originalEnv,
      PRODUCTS_TABLE_NAME: 'test-products-table',
      STOCK_TABLE_NAME: 'test-stock-table',
      CREATE_PRODUCT_TOPIC_ARN: 'arn:aws:sns:us-east-1:123456789012:test-topic',
    } as any;

    // Mock successful DynamoDB operations
    mockDynamoDbPut.mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });

    // Mock successful SNS publish
    mockSnsPublish.mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createSQSRecord = (body: any): SQSRecord => ({
    messageId: 'test-message-id',
    receiptHandle: 'test-receipt-handle',
    body: JSON.stringify(body),
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: '1234567890000',
      SenderId: 'test-sender',
      ApproximateFirstReceiveTimestamp: '1234567890000',
    },
    messageAttributes: {},
    md5OfBody: 'test-md5',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
    awsRegion: 'us-east-1',
  });

  const createSQSEvent = (records: SQSRecord[]): SQSEvent => ({
    Records: records,
  });

  it('should process products with existing IDs successfully', async () => {
    const product = {
      id: 'existing-id-1',
      title: 'Test Product',
      description: 'Test Description',
      price: '100',
      count: '5',
    };

    const event = createSQSEvent([createSQSRecord(product)]);

    await catalogBatchProcess(event, {} as any, {} as any);

    // Verify DynamoDB puts
    expect(mockDynamoDbPut).toHaveBeenCalledTimes(2);

    // Verify products table insert
    expect(mockDynamoDbPut).toHaveBeenCalledWith({
      TableName: 'test-products-table',
      Item: {
        id: 'existing-id-1',
        title: 'Test Product',
        description: 'Test Description',
        price: 100,
      },
    });

    // Verify stock table insert
    expect(mockDynamoDbPut).toHaveBeenCalledWith({
      TableName: 'test-stock-table',
      Item: {
        product_id: 'existing-id-1',
        count: 5,
      },
    });

    // Verify SNS notification
    expect(mockSnsPublish).toHaveBeenCalledWith({
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
      Subject: 'Products created',
      Message: JSON.stringify([{
        id: 'existing-id-1',
        title: 'Test Product',
        description: 'Test Description',
        price: 100,
        count: 5,
      }]),
      MessageAttributes: {
        hasExpensive: {
          DataType: 'String',
          StringValue: 'false',
        },
      },
    });
  });

  it('should generate UUID for products without ID', async () => {
    const product = {
      title: 'Product Without ID',
      description: 'Test Description',
      price: '50',
      count: '10',
    };

    const event = createSQSEvent([createSQSRecord(product)]);

    await catalogBatchProcess(event, {} as any, {} as any);

    // Verify UUID was generated
    expect(mockRandomUUID).toHaveBeenCalled();

    // Verify DynamoDB puts with generated ID
    expect(mockDynamoDbPut).toHaveBeenCalledWith({
      TableName: 'test-products-table',
      Item: {
        id: 'test-uuid-123',
        title: 'Product Without ID',
        description: 'Test Description',
        price: 50,
      },
    });

    expect(mockDynamoDbPut).toHaveBeenCalledWith({
      TableName: 'test-stock-table',
      Item: {
        product_id: 'test-uuid-123',
        count: 10,
      },
    });
  });

  it('should set hasExpensive filter to true for expensive products', async () => {
    const expensiveProduct = {
      id: 'expensive-1',
      title: 'Expensive Product',
      description: 'Very expensive',
      price: '1500',
      count: '2',
    };

    const event = createSQSEvent([createSQSRecord(expensiveProduct)]);

    await catalogBatchProcess(event, {} as any, {} as any);

    expect(mockSnsPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        MessageAttributes: {
          hasExpensive: {
            DataType: 'String',
            StringValue: 'true',
          },
        },
      })
    );
  });

  it('should process multiple products in batch', async () => {
    const products = [
      { id: '1', title: 'Product 1', description: 'Desc 1', price: '100', count: '5' },
      { title: 'Product 2', description: 'Desc 2', price: '2000', count: '3' },
      { id: '3', title: 'Product 3', description: 'Desc 3', price: '50', count: '10' },
    ];

    const records = products.map(createSQSRecord);
    const event = createSQSEvent(records);

    await catalogBatchProcess(event, {} as any, {} as any);

    // Should make 6 DynamoDB calls (3 products + 3 stocks)
    expect(mockDynamoDbPut).toHaveBeenCalledTimes(6);

    // Should generate UUID for product without ID
    expect(mockRandomUUID).toHaveBeenCalledTimes(1);

    // Should send SNS with hasExpensive=true (because of product with price 2000)
    expect(mockSnsPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        MessageAttributes: {
          hasExpensive: {
            DataType: 'String',
            StringValue: 'true',
          },
        },
      })
    );
  });

  it('should handle DynamoDB errors gracefully', async () => {
    const product = {
      id: 'error-product',
      title: 'Error Product',
      description: 'This will fail',
      price: '100',
      count: '5',
    };

    // Mock DynamoDB to throw error
    mockDynamoDbPut.mockReturnValueOnce({
      promise: jest.fn().mockRejectedValue(new Error('DynamoDB Error')),
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const event = createSQSEvent([createSQSRecord(product)]);

    await catalogBatchProcess(event, {} as any, {} as any);

    // Should log the error
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error processing record',
      expect.any(Object),
      expect.any(Error)
    );

    // Should not send SNS notification when no products are created
    expect(mockSnsPublish).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle invalid JSON in SQS message', async () => {
    const invalidRecord: SQSRecord = {
      ...createSQSRecord({}),
      body: 'invalid-json-string',
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const event = createSQSEvent([invalidRecord]);

    await catalogBatchProcess(event, {} as any, {} as any);

    // Should log the error
    expect(consoleSpy).toHaveBeenCalled();

    // Should not make any DynamoDB calls
    expect(mockDynamoDbPut).not.toHaveBeenCalled();

    // Should not send SNS notification
    expect(mockSnsPublish).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should convert string prices and counts to numbers', async () => {
    const product = {
      id: 'conversion-test',
      title: 'Conversion Test',
      description: 'Test number conversion',
      price: '123.45',
      count: '7',
    };

    const event = createSQSEvent([createSQSRecord(product)]);

    await catalogBatchProcess(event, {} as any, {} as any);

    // Verify price is converted to number
    expect(mockDynamoDbPut).toHaveBeenCalledWith({
      TableName: 'test-products-table',
      Item: {
        id: 'conversion-test',
        title: 'Conversion Test',
        description: 'Test number conversion',
        price: 123.45,
      },
    });

    // Verify count is converted to number
    expect(mockDynamoDbPut).toHaveBeenCalledWith({
      TableName: 'test-stock-table',
      Item: {
        product_id: 'conversion-test',
        count: 7,
      },
    });
  });

  it('should not send SNS notification when no products are created', async () => {
    // Create an event with an invalid record that will fail processing
    const invalidRecord: SQSRecord = {
      ...createSQSRecord({}),
      body: 'invalid-json',
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const event = createSQSEvent([invalidRecord]);

    await catalogBatchProcess(event, {} as any, {} as any);

    // Should not send SNS notification
    expect(mockSnsPublish).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle mixed successful and failed records', async () => {
    const validProduct = {
      id: 'valid-1',
      title: 'Valid Product',
      description: 'This will succeed',
      price: '100',
      count: '5',
    };

    const validRecord = createSQSRecord(validProduct);
    const invalidRecord: SQSRecord = {
      ...createSQSRecord({}),
      body: 'invalid-json',
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const event = createSQSEvent([validRecord, invalidRecord]);

    await catalogBatchProcess(event, {} as any, {} as any);

    // Should process the valid record
    expect(mockDynamoDbPut).toHaveBeenCalledTimes(2);

    // Should send SNS notification for successful products
    expect(mockSnsPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        Message: JSON.stringify([{
          id: 'valid-1',
          title: 'Valid Product',
          description: 'This will succeed',
          price: 100,
          count: 5,
        }]),
      })
    );

    // Should log error for invalid record
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
