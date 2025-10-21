import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // API Gateway CloudWatch role
        const apiGwLogsRole = new iam.Role(this, 'ApiGatewayCloudWatchLogsRole', {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
            ],
        });

        new apigateway.CfnAccount(this, 'ApiGatewayAccount', {
            cloudWatchRoleArn: apiGwLogsRole.roleArn,
        });

        // S3 Bucket
        const importBucket = new s3.Bucket(this, 'ImportBucket', {
            bucketName: `import-service-bucket-${this.account}-${this.region}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            cors: [{
                allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
                allowedOrigins: ['*'],
                allowedHeaders: ['*'],
            }],
        });

        // Create uploaded folder
        new s3deploy.BucketDeployment(this, 'DeployFolderStructure', {
            sources: [s3deploy.Source.jsonData('uploaded/.keep', {})],
            destinationBucket: importBucket,
            prune: false,
        });

        // Import SQS queue from catalog service
        const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');
        const catalogItemsQueue = sqs.Queue.fromQueueArn(
            this,
            'CatalogItemsQueueImport',
            catalogItemsQueueArn
        );

        // Lambda functions
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

        // Grant permissions
        importBucket.grantPut(importProductsFileLambda);
        importBucket.grantPutAcl(importProductsFileLambda);
        importBucket.grantRead(importFileParserLambda);
        catalogItemsQueue.grantSendMessages(importFileParserLambda);

        // S3 event notification
        importBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3notifications.LambdaDestination(importFileParserLambda),
            {prefix: 'uploaded/'}
        );

        // API Gateway
        const apiLogGroup = new logs.LogGroup(this, 'ImportServiceApiLogGroup', {
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const api = new apigateway.RestApi(this, 'ImportServiceApi', {
            restApiName: 'Import Service API',
            description: 'This API serves the Import Service Lambda functions.',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['*'],
            },
            deployOptions: {
                accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                stageName: 'prod',
            },
        });

        // Import authorizer Lambda using cross-stack reference
        const authorizerFunctionArn = cdk.Fn.importValue('BasicAuthorizerFunctionArn');
        const authorizerFunction = lambda.Function.fromFunctionArn(
            this,
            'ImportedAuthorizerFunction',
            authorizerFunctionArn
        );

        // Create TokenAuthorizer
        const tokenAuthorizer = new apigateway.TokenAuthorizer(this, 'BasicTokenAuthorizer', {
            handler: authorizerFunction,
            identitySource: 'method.request.header.Authorization',
            resultsCacheTtl: cdk.Duration.seconds(0),
        });

        // API Resources and Methods
        const importProductsFileIntegration = new apigateway.LambdaIntegration(importProductsFileLambda);
        const importResource = api.root.addResource('import');

        importResource.addMethod('GET', importProductsFileIntegration, {
            authorizer: tokenAuthorizer,
            authorizationType: apigateway.AuthorizationType.CUSTOM,
        });

        // Outputs

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
        });
    }
}