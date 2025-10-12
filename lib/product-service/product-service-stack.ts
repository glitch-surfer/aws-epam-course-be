import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda_event_sources from 'aws-cdk-lib/aws-lambda-event-sources';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, 'ProductsTable', {
      tableName: 'products',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stockTable = new dynamodb.Table(this, 'StockTable', {
      tableName: 'stock',
      partitionKey: {
        name: 'product_id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const getProductsListLambda = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'getProductsList.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    });

    const getProductsByIdLambda = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'getProductsById.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    });

    const createProductLambda = new lambda.Function(this, 'createProduct', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'createProduct.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    });

    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      visibilityTimeout: cdk.Duration.seconds(60),
    });

    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: catalogItemsQueue.queueArn,
      exportName: 'CatalogItemsQueueArn',
    });


    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'createProductTopic',
    });

    createProductTopic.addSubscription(
      new sns_subscriptions.EmailSubscription('marker661@gmail.com')
    );

    createProductTopic.addSubscription(
      new sns_subscriptions.EmailSubscription('marker661@yandex.ru', {
        filterPolicy: {
          hasExpensive: sns.SubscriptionFilter.stringFilter({
            allowlist: ['true'],
          }),
        },
      })
    );

    const catalogBatchProcessLambda = new lambda.Function(this, 'catalogBatchProcess', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      handler: 'catalogBatchProcess.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
        CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
      },
    });

    productsTable.grantWriteData(catalogBatchProcessLambda);
    stockTable.grantWriteData(catalogBatchProcessLambda);
    createProductTopic.grantPublish(catalogBatchProcessLambda);

    catalogBatchProcessLambda.addEventSource(
      new lambda_event_sources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    productsTable.grantReadData(getProductsListLambda);
    stockTable.grantReadData(getProductsListLambda);

    productsTable.grantReadData(getProductsByIdLambda);
    stockTable.grantReadData(getProductsByIdLambda);

    productsTable.grantWriteData(createProductLambda);
    stockTable.grantWriteData(createProductLambda);

    const api = new apigateway.RestApi(this, "product-service-api", {
      restApiName: "Product Service API",
      description: "This API serves the Product Service Lambda functions.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsListLambda);
    const getProductsByIdIntegration = new apigateway.LambdaIntegration(getProductsByIdLambda);
    const createProductIntegration = new apigateway.LambdaIntegration(createProductLambda);

    const productsResource = api.root.addResource("products");

    productsResource.addMethod('GET', getProductsListIntegration);
    productsResource.addMethod('POST', createProductIntegration);

    const productByIdResource = productsResource.addResource('{productId}');
    productByIdResource.addMethod('GET', getProductsByIdIntegration);
  }
}
