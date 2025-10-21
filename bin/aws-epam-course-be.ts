#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {AuthorizationServiceStack} from '../lib/authorization-service/authorization-service-stack';
import {ImportServiceStack} from '../lib/import-service/import-service-stack';
import {ProductServiceStack} from '../lib/product-service/product-service-stack';

const app = new cdk.App();

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
};

// Deploy authorization service first
const authorizationStack = new AuthorizationServiceStack(app, 'AuthorizationServiceStack', { env });

// Deploy product service
new ProductServiceStack(app, 'ProductServiceStack', { env });

// Deploy import service (depends on authorization service)
const importStack = new ImportServiceStack(app, 'ImportServiceStack', { env });

// Explicit dependency to ensure authorization stack is deployed first
importStack.addDependency(authorizationStack);