interface AuthorizerEvent {
    type: string;
    authorizationToken?: string;
    methodArn: string;
}

interface PolicyStatement {
    Action: string;
    Effect: 'Allow' | 'Deny';
    Resource: string | string[];
}

interface AuthResponse {
    principalId: string;
    policyDocument: {
        Version: string;
        Statement: PolicyStatement[];
    };
    context?: Record<string, any>;
}

const buildPolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string, context?: Record<string, any>): AuthResponse => ({
    principalId,
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource,
            },
        ],
    },
    context,
});

export const main = async (event: AuthorizerEvent): Promise<AuthResponse> => {
    console.log('=== AUTHORIZER START ===');
    console.log('Full event:', JSON.stringify(event, null, 2));

    const methodArn = event.methodArn || '*';
    console.log('Method ARN:', methodArn);

    try {
        if (!event.authorizationToken) {
            console.warn('No authorization token provided');
            return buildPolicy('unknown', 'Deny', methodArn, { reason: 'No token provided' });
        }

        const token = event.authorizationToken;
        const [scheme, encoded] = token.split(' ');

        if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) {
            console.warn('Malformed authorization token');
            return buildPolicy('unknown', 'Deny', methodArn, { reason: 'Malformed token' });
        }

        let decoded: string;
        try {
            decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        } catch (e) {
            console.warn('Failed to base64 decode token');
            return buildPolicy('unknown', 'Deny', methodArn, { reason: 'Bad base64' });
        }

        const separatorIndex = decoded.indexOf(':');
        if (separatorIndex === -1) {
            console.warn('Decoded token missing colon separator');
            return buildPolicy('unknown', 'Deny', methodArn, { reason: 'Invalid credentials format' });
        }

        const username = decoded.slice(0, separatorIndex);
        const password = decoded.slice(separatorIndex + 1);

        if (!username || !password) {
            console.warn('Empty username or password');
            return buildPolicy('unknown', 'Deny', methodArn, { reason: 'Empty username or password' });
        }

        const expectedPassword = process.env[username];
        if (!expectedPassword || expectedPassword !== password) {
            console.warn(`Invalid credentials for user: ${username}`);
            return buildPolicy(username || 'unknown', 'Deny', methodArn, { reason: 'Invalid credentials' });
        }

        console.log(`Authorization success for user: ${username}`);
        const response = buildPolicy(username, 'Allow', methodArn, { authorizedUser: username });
        console.log('Built policy response:', JSON.stringify(response, null, 2));
        return response;

    } catch (error) {
        console.error('Unexpected error in basicAuthorizer', error);
        return buildPolicy('unknown', 'Deny', methodArn, { reason: 'Internal error' });
    }
};


