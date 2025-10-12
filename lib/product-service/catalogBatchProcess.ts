import {SQSEvent, SQSHandler} from 'aws-lambda';
import {DynamoDB} from 'aws-sdk';
import {SNS} from 'aws-sdk';
import {randomUUID} from 'crypto';

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
            product.id = randomUUID();

            const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
            const count = typeof product.count === 'string' ? parseInt(product.count, 10) : product.count;

            await dynamoDb.put({
                TableName: productsTableName,
                Item: {
                    id: product.id,
                    title: product.title,
                    description: product.description,
                    price: price,
                },
            }).promise();
            await dynamoDb.put({
                TableName: stockTableName,
                Item: {
                    product_id: product.id,
                    count: count,
                },
            }).promise();

            createdProducts.push({
                ...product,
                price: price,
                count: count
            });
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
