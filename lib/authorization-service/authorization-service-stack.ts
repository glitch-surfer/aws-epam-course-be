import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AuthorizationServiceStack extends cdk.Stack {
    public readonly basicAuthorizerFunction: lambda.Function;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Load environment variables
        const envFile = path.join(process.cwd(), '.env');
        if (fs.existsSync(envFile)) {
            dotenv.config({path: envFile});
        }

        // Collect credentials from environment variables
        const credentialsEnv: Record<string, string> = {};
        Object.entries(process.env).forEach(([key, value]) => {
            if (value && key.startsWith('CRED_')) {
                const username = key.replace('CRED_', '');
                credentialsEnv[username] = value;
            }
        });

        this.basicAuthorizerFunction = new lambda.Function(this, 'basicAuthorizer', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'basicAuthorizer.main',
            code: lambda.Code.fromAsset(path.join(__dirname)),
            timeout: cdk.Duration.seconds(5),
            environment: credentialsEnv,
            description: 'Basic token authorizer for API Gateway'
        });

        // This allows any API Gateway in this account to use this authorizer
        this.basicAuthorizerFunction.addPermission('ApiGatewayInvokeAuthorizer', {
            principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:*`
        });

        // Export the function ARN for cross-stack reference
        new cdk.CfnOutput(this, 'BasicAuthorizerFunctionArn', {
            value: this.basicAuthorizerFunction.functionArn,
            exportName: 'BasicAuthorizerFunctionArn'
        });
    }
}