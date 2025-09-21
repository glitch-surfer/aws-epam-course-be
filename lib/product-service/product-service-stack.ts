import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsListLambda = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'getProductsList.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
    });

    const getProductsByIdLambda = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'getProductsById.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
    });

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

    const productsResource = api.root.addResource("products");

    productsResource.addMethod('GET', getProductsListIntegration);

    const productByIdResource = productsResource.addResource('{productId}');
    productByIdResource.addMethod('GET', getProductsByIdIntegration);
  }
}
