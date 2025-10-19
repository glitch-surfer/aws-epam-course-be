import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import {ArnFormat} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface ImportServiceStackProps extends cdk.StackProps {
  basicAuthorizerFn?: lambda.IFunction;
}

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ImportServiceStackProps) {
    super(scope, id, props);

    const importBucket = new s3.Bucket(this, 'ImportBucket', {
      bucketName: `import-service-bucket-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeployFolderStructure', {
      sources: [s3deploy.Source.jsonData('uploaded/.keep', {})], // Creates an empty JSON file
      destinationBucket: importBucket,
      prune: false,
    });

    const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');
    const catalogItemsQueue = sqs.Queue.fromQueueArn(
        this,
        'CatalogItemsQueueImport',
        catalogItemsQueueArn
    );


    const importProductsFileLambda = new lambda.Function(this, 'importProductsFile', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'importProductsFile.main',
      code: lambda.Code.fromAsset(path.join(__dirname)),
      environment: {
        BUCKET_NAME: importBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const importFileParserLambda = new lambda.Function(this, 'importFileParser', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'importFileParser.main',
      code: lambda.Code.fromAsset(path.join(__dirname)),
      environment: {
        BUCKET_NAME: importBucket.bucketName,
        CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
      timeout: cdk.Duration.seconds(30),
    });

    importBucket.grantPut(importProductsFileLambda);
    importBucket.grantPutAcl(importProductsFileLambda);
    importBucket.grantRead(importFileParserLambda);
    catalogItemsQueue.grantSendMessages(importFileParserLambda);

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notifications.LambdaDestination(importFileParserLambda),
      { prefix: 'uploaded/' }
    );

    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service API',
      description: 'This API serves the Import Service Lambda functions.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*'],
      },
    });

    const importProductsFileIntegration = new apigateway.LambdaIntegration(importProductsFileLambda);

    // Create or reference basic authorizer
    let authorizerFn: lambda.IFunction | undefined = props?.basicAuthorizerFn;
    if (!authorizerFn) {
      // Try to import by CloudFormation export if not passed explicitly
      try {
        const fnArn = cdk.Fn.importValue('BasicAuthorizerFunctionArn');
        authorizerFn = lambda.Function.fromFunctionArn(this, 'ImportedBasicAuthorizerFn', fnArn);
      } catch (e) {
        // ignore; authorization won't be attached
      }
    }

    let methodOptions: apigateway.MethodOptions | undefined;
    if (authorizerFn) {
      const tokenAuthorizer = new apigateway.TokenAuthorizer(this, 'BasicTokenAuthorizer', {
        handler: authorizerFn,
        identitySource: 'method.request.header.Authorization',
        resultsCacheTtl: cdk.Duration.seconds(0),
      });
      methodOptions = {
        authorizer: tokenAuthorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      };
    }

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', importProductsFileIntegration, methodOptions);

    new cdk.CfnOutput(this, 'ImportBucketName', {
      value: importBucket.bucketName,
      description: 'S3 Bucket name for import service',
    });

    new cdk.CfnOutput(this, 'ImportBucketArn', {
      value: importBucket.bucketArn,
      description: 'S3 Bucket ARN for import service',
    });

    new cdk.CfnOutput(this, 'ImportServiceApiUrl', {
      value: api.url,
      description: 'Import Service API Gateway URL',
    });
  }
}
