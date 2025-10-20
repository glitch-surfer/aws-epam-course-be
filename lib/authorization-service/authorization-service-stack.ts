import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export interface AuthorizationServiceStackProps extends cdk.StackProps {
}

export class AuthorizationServiceStack extends cdk.Stack {
    public readonly basicAuthorizerArn: string;
    public readonly lambda: lambda.Function;

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
            if (key.startsWith('CRED_')) {
                const username = key.replace('CRED_', '');
                credentialsEnv[username] = value;
            }
        });

        this.lambda = new lambda.Function(this, 'basicAuthorizer', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'basicAuthorizer.main',
            code: lambda.Code.fromAsset(path.join(__dirname)),
            timeout: cdk.Duration.seconds(5),
            environment: credentialsEnv,
            description: 'Basic token authorizer that validates user:password from environment variables.'
        });

        this.basicAuthorizerArn = this.lambda.functionArn;

        new cdk.CfnOutput(this, 'BasicAuthorizerFunctionArn', {
            value: this.basicAuthorizerArn,
            exportName: 'BasicAuthorizerFunctionArn'
        });
    }
}

