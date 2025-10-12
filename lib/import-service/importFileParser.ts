import { S3Event, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const queueUrl = process.env.CATALOG_ITEMS_QUEUE_URL!;

export const main: S3Handler = async (event: S3Event) => {
  console.log('ImportFileParser Lambda triggered with event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing file: ${objectKey} from bucket: ${bucketName}`);

    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const response = await s3Client.send(getObjectCommand);

      if (!response.Body) {
        console.error(`No body found for object: ${objectKey}`);
        continue;
      }

      const stream = response.Body as Readable;

      await new Promise((resolve, reject) => {
        let recordCount = 0;
        const sendPromises: Promise<any>[] = [];
        stream
          .pipe(csv())
          .on('data', (data: any) => {
            recordCount++;
            const sendPromise = sqsClient.send(
              new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify(data),
              })
            ).catch((err: unknown) => {
              console.error('Failed to send message to SQS:', err);
            });
            sendPromises.push(sendPromise);
          })
          .on('end', async () => {
            await Promise.all(sendPromises);
            console.log(`Finished processing ${objectKey}. Total records sent to SQS: ${recordCount}`);
            resolve(void 0);
          })
          .on('error', (error: unknown) => {
            console.error(`Error parsing CSV for ${objectKey}:`, error);
            reject(error);
          });
      });

    } catch (error) {
      console.error(`Error processing file ${objectKey}:`, error);
      throw error;
    }
  }
};
