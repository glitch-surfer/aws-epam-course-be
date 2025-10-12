import { SQSEvent, SQSHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { SNS } from 'aws-sdk';

const productsTableName = process.env.PRODUCTS_TABLE_NAME!;
const stockTableName = process.env.STOCK_TABLE_NAME!;
const snsTopicArn = process.env.CREATE_PRODUCT_TOPIC_ARN!;

const dynamoDb = new DynamoDB.DocumentClient();
const sns = new SNS();

export const main: SQSHandler = async (event: SQSEvent) => {
  const createdProducts = [];
  for (const record of event.Records) {
    try {
      const product = JSON.parse(record.body);
      await dynamoDb.put({
        TableName: productsTableName,
        Item: {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
        },
      }).promise();
      await dynamoDb.put({
        TableName: stockTableName,
        Item: {
          product_id: product.id,
          count: product.count,
        },
      }).promise();
      createdProducts.push(product);
    } catch (err) {
      console.error('Error processing record', record, err);
    }
  }
  if (createdProducts.length > 0) {
    await sns.publish({
      TopicArn: snsTopicArn,
      Subject: 'Products created',
      Message: JSON.stringify(createdProducts),
      MessageAttributes: {
        hasExpensive: {
          DataType: 'String',
          StringValue: createdProducts.some(p => p.price > 1000) ? 'true' : 'false',
        },
      },
    }).promise();
  }
};

