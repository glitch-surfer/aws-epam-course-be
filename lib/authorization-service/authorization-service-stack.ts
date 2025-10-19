import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export interface AuthorizationServiceStackProps extends cdk.StackProps {
}

export class AuthorizationServiceStack extends cdk.Stack {
    public readonly basicAuthorizerFn: lambda.Function;

    constructor(scope: Construct, id: string, props?: AuthorizationServiceStackProps) {
        super(scope, id, props);

        // Load .env if present (local development). Do not commit .env.
        const envFile = path.join(process.cwd(), '.env');
        if (fs.existsSync(envFile)) {
            dotenv.config({path: envFile});
        }

        // Collect credential env vars from process.env that match TEST_PASSWORD pattern
        // Requirement: one env var with key = github login, value = TEST_PASSWORD
        const credentialsEnv: Record<string, string> = {};
        Object.entries(process.env).forEach(([key, value]) => {
            if (!value) return;
            // Lambda env variable name rules: must match /[a-zA-Z_][a-zA-Z0-9_]+/
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                credentialsEnv[key] = value;
            }
        });

        this.basicAuthorizerFn = new lambda.Function(this, 'basicAuthorizer', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'basicAuthorizer.main',
            code: lambda.Code.fromAsset(path.join(__dirname)),
            timeout: cdk.Duration.seconds(5),
            environment: credentialsEnv,
            description: 'Basic token authorizer that validates user:password from environment variables.'
        });

        new cdk.CfnOutput(this, 'BasicAuthorizerFunctionArn', {
            value: this.basicAuthorizerFn.functionArn,
            exportName: 'BasicAuthorizerFunctionArn'
        });
    }
}

