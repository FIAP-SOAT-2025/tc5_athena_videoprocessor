import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import AWS from 'aws-sdk';

interface NotificationPayload {
  to: string;
  subject: string;
  type: 'success' | 'error';
  username?: string;
  filename?: string;
}

interface NotificationResponse {
  success: boolean;
  message: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly isLocal: boolean;
  private readonly lambdaUrl: string;
  private readonly functionName: string;

  constructor(private readonly configService: ConfigService) {
    this.isLocal = this.configService.get<string>('NODE_ENV') === 'development';
    this.lambdaUrl = this.configService.get<string>('LAMBDA_NOTIFICATION_URL', 'http://localhost:3003');
    this.functionName = this.configService.get<string>('LAMBDA_FUNCTION_NAME', 'athena-notification-service');
    
    this.logger.log(`Notification service initialized - Mode: ${this.isLocal ? 'LOCAL' : 'AWS'}`);
  }

  async sendNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    this.logger.log(`Sending ${payload.type} notification for file: ${payload.filename}`);

    try {
      if (this.isLocal) {
        return await this.sendLocalNotification(payload);
      } else {
        return await this.sendAWSLambdaNotification(payload);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send notification: ${message}`);
      
      return {
        success: false,
        message: `Notification failed: ${message}`
      };
    }
  }

  async sendSuccessNotification(
    userId: string, 
    filename: string, 
    userEmail?: string,
    username?: string
  ): Promise<NotificationResponse> {
    const payload: NotificationPayload = {
      to: userEmail!,
      subject: `✅ Vídeo processado com sucesso: ${filename}`,
      type: 'success',
      username: username || 'Usuário',
      filename
    };

    return this.sendNotification(payload);
  }

  async sendErrorNotification(
    userId: string, 
    filename: string, 
    errorMessage: string,
    userEmail?: string,
    username?: string
  ): Promise<NotificationResponse> {
    const payload: NotificationPayload = {
      to: userEmail!, 
      subject: `❌ Erro no processamento: ${filename}`,
      type: 'error',
      username: username || 'Usuário',
      filename
    };

    return this.sendNotification(payload);
  }

  private async sendLocalNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    this.logger.log(`🔄 Sending notification error to local Lambda : ${this.lambdaUrl}`);

    try {
      const response = await axios.post(`${this.lambdaUrl}/invoke`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 segundos timeout
      });

      this.logger.log(`✅ Local notification error sent successfully: ${response.data.message}`);
      
      return {
        success: true,
        message: response.data.message || 'Email sent successfully'
      };
    } catch (error) {
      let message = 'Unknown error';
      
      if (error instanceof AxiosError) {
        if (error.response) {
          message = `HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
        } else if (error.request) {
          message = `Connection failed to ${this.lambdaUrl}. Is the Lambda service running?`;
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      this.logger.error(`❌ Local notification failed: ${message}`);
      throw new Error(message);
    }
  }

  private async sendAWSLambdaNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    this.logger.log(`🔄 Sending notification to AWS Lambda: ${this.functionName}`);

    try {
           
      const lambda = new AWS.Lambda({
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      });

      const params = {
        FunctionName: this.functionName,
        Payload: JSON.stringify(payload),
      };

      const result = await lambda.invoke(params).promise();
      
      if (result.StatusCode !== 200) {
        throw new Error(`Lambda invocation failed with status: ${result.StatusCode}`);
      }

      const responseBody = result.Payload ? JSON.parse(result.Payload.toString()) : {};
      this.logger.log(`✅ AWS Lambda notification sent successfully`);
      
      return {
        success: true,
        message: responseBody.message || 'Email sent successfully'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ AWS Lambda notification failed: ${message}`);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; mode: string; endpoint?: string }> {
    if (this.isLocal) {
      try {
        const response = await axios.get(`${this.lambdaUrl}/health`, {
          timeout: 5000
        });
        const isHealthy = response.status === 200;
        
        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          mode: 'local',
          endpoint: this.lambdaUrl
        };
      } catch (error) {
        this.logger.warn(`Health check failed for ${this.lambdaUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {
          status: 'unhealthy',
          mode: 'local',
          endpoint: this.lambdaUrl
        };
      }
    }
    
    return {
      status: 'configured',
      mode: 'aws',
    };
  }
}