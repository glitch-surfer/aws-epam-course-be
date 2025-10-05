import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Define the response interfaces and builder directly in the Lambda function to avoid module resolution issues
interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

class ResponseBuilder {
  private static defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
  };

  static success<T>(data: T, statusCode: number = 200): ApiResponse {
    return {
      statusCode,
      headers: this.defaultHeaders,
      body: JSON.stringify(data),
    };
  }

  static error(message: string, statusCode: number = 500, error?: string): ApiResponse {
    const errorResponse: any = { message };
    if (error) {
      errorResponse.error = error;
    }

    return {
      statusCode,
      headers: this.defaultHeaders,
      body: JSON.stringify(errorResponse),
    };
  }

  static badRequest(message: string = 'Bad Request'): ApiResponse {
    return this.error(message, 400);
  }

  static internalServerError(message: string = 'Internal server error', error?: string): ApiResponse {
    return this.error(message, 500, error);
  }
}

export const main = async (event: any): Promise<any> => {
  console.log('importProductsFile Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return ResponseBuilder.badRequest('Missing required query parameter: name');
    }

    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      console.error('BUCKET_NAME environment variable is not set');
      return ResponseBuilder.internalServerError('Server configuration error');
    }

    const key = `uploaded/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: 'text/csv'
    });

    const signedUrlExpireSeconds = 60 * 5; // 5 minutes

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: signedUrlExpireSeconds
    });

    console.log(`Generated signed URL for key: ${key}`);

    return ResponseBuilder.success({ url });

  } catch (error) {
    console.error('Error in importProductsFile:', error);
    return ResponseBuilder.internalServerError(
      'Failed to generate signed URL',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};
