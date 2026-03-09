import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import axios, { AxiosError } from 'axios';
import AWS from 'aws-sdk';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock AWS SDK
jest.mock('aws-sdk');
const mockLambdaInvoke = jest.fn();
const mockLambda = {
  invoke: jest.fn(() => ({
    promise: mockLambdaInvoke,
  })),
};
(AWS.Lambda as unknown as jest.Mock).mockImplementation(() => mockLambda);

describe('NotificationService', () => {
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  const createService = () => new NotificationService(configService);

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
        };
        return config[key] || defaultValue;
      });
      
      const service = createService();
      expect(service).toBeDefined();
    });

    it('should initialize in local mode when NODE_ENV is development', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
          LAMBDA_FUNCTION_NAME: 'test-function',
        };
        return config[key] || defaultValue;
      });

      const testService = new NotificationService(configService);
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should initialize in AWS mode when NODE_ENV is not development', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
          LAMBDA_FUNCTION_NAME: 'prod-function',
        };
        return config[key] || defaultValue;
      });

      const testService = new NotificationService(configService);
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should use default values when config is not provided', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => defaultValue);

      const testService = new NotificationService(configService);
      expect(configService.get).toHaveBeenCalledWith('LAMBDA_NOTIFICATION_URL', 'http://localhost:3003');
      expect(configService.get).toHaveBeenCalledWith('LAMBDA_FUNCTION_NAME', 'athena-notification-service');
    });
  });

  describe('sendSuccessNotification', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
          LAMBDA_FUNCTION_NAME: 'test-function',
        };
        return config[key] || defaultValue;
      });
    });

    it('should send success notification with all parameters', async () => {
      const mockResponse = {
        data: { message: 'Email sent successfully' },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const service = createService();
      const result = await service.sendSuccessNotification(
        'user-123',
        'video.mp4',
        'user@example.com',
        'John Doe'
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3003/invoke',
        {
          to: 'user@example.com',
          subject: '✅ Vídeo processado com sucesso: video.mp4',
          type: 'success',
          username: 'John Doe',
          filename: 'video.mp4',
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      expect(result).toEqual({
        success: true,
        message: 'Email sent successfully',
      });
    });

    it('should use default username when not provided', async () => {
      const mockResponse = {
        data: { message: 'Email sent successfully' },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const service = createService();
      await service.sendSuccessNotification('user-123', 'video.mp4', 'user@example.com');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          username: 'Usuário',
        }),
        expect.any(Object)
      );
    });

    it('should handle missing response message', async () => {
      const mockResponse = {
        data: {},
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const service = createService();
      const result = await service.sendSuccessNotification(
        'user-123',
        'video.mp4',
        'user@example.com'
      );

      expect(result).toEqual({
        success: true,
        message: 'Email sent successfully',
      });
    });
  });

  describe('sendErrorNotification', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
          LAMBDA_FUNCTION_NAME: 'test-function',
        };
        return config[key] || defaultValue;
      });
    });

    it('should send error notification with all parameters', async () => {
      const mockResponse = {
        data: { message: 'Error notification sent' },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const service = createService();
      const result = await service.sendErrorNotification(
        'user-123',
        'video.mp4',
        'Processing failed',
        'user@example.com',
        'John Doe'
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3003/invoke',
        {
          to: 'user@example.com',
          subject: '❌ Erro no processamento: video.mp4',
          type: 'error',
          username: 'John Doe',
          filename: 'video.mp4',
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      expect(result).toEqual({
        success: true,
        message: 'Error notification sent',
      });
    });

    it('should use default username when not provided', async () => {
      const mockResponse = {
        data: { message: 'Error notification sent' },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const service = createService();
      await service.sendErrorNotification(
        'user-123',
        'video.mp4',
        'Processing failed',
        'user@example.com'
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          username: 'Usuário',
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendLocalNotification', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
          LAMBDA_FUNCTION_NAME: 'test-function',
        };
        return config[key] || defaultValue;
      });
    });

    it('should handle axios response error', async () => {
      const mockError = new AxiosError('Request failed', 'ERR_BAD_REQUEST');
      mockError.response = {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Invalid payload' },
        headers: {},
        config: {} as any,
      };
      mockedAxios.post.mockRejectedValue(mockError);

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'success',
        filename: 'test.mp4',
      });

      expect(result).toEqual({
        success: false,
        message: 'Notification failed: HTTP 400: Invalid payload',
      });
    });

    it('should handle axios request error', async () => {
      const mockError = new AxiosError('Network Error', 'ERR_NETWORK');
      mockError.request = {};
      mockedAxios.post.mockRejectedValue(mockError);

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'success',
        filename: 'test.mp4',
      });

      expect(result).toEqual({
        success: false,
        message: 'Notification failed: Connection failed to http://localhost:3003. Is the Lambda service running?',
      });
    });

    it('should handle axios setup error', async () => {
      const mockError = new AxiosError('', 'ERR_CONFIG');
      mockedAxios.post.mockRejectedValue(mockError);

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'success',
        filename: 'test.mp4',
      });

      expect(result).toEqual({
        success: false,
        message: 'Notification failed: ',
      });
    });

    it('should handle generic error', async () => {
      const mockError = new Error('Generic error');
      mockedAxios.post.mockRejectedValue(mockError);

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'success',
        filename: 'test.mp4',
      });

      expect(result).toEqual({
        success: false,
        message: 'Notification failed: Generic error',
      });
    });

    it('should handle unknown error type', async () => {
      mockedAxios.post.mockRejectedValue('String error');

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'success',
        filename: 'test.mp4',
      });

      expect(result).toEqual({
        success: false,
        message: 'Notification failed: Unknown error',
      });
    });
  });

  describe('sendAWSLambdaNotification', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          LAMBDA_FUNCTION_NAME: 'prod-function',
          AWS_REGION: 'us-west-2',
          AWS_ACCESS_KEY_ID: 'test-access-key',
          AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        };
        return config[key] || defaultValue;
      });
    });

    it('should send notification via AWS Lambda successfully', async () => {
      mockLambdaInvoke.mockResolvedValue({
        StatusCode: 200,
        Payload: JSON.stringify({ message: 'Lambda executed successfully' }),
      });

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'success',
        filename: 'test.mp4',
      });

      expect(AWS.Lambda).toHaveBeenCalledWith({
        region: 'us-west-2',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith({
        FunctionName: 'prod-function',
        Payload: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test',
          type: 'success',
          filename: 'test.mp4',
        }),
      });

      expect(result).toEqual({
        success: true,
        message: 'Lambda executed successfully',
      });
    });

    it('should use default values for AWS configuration', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          LAMBDA_FUNCTION_NAME: 'prod-function',
        };
        return config[key] || defaultValue;
      });

      mockLambdaInvoke.mockResolvedValue({
        StatusCode: 200,
        Payload: JSON.stringify({ message: 'Success' }),
      });

      const service = createService();
      await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'success',
      });

      expect(AWS.Lambda).toHaveBeenCalledWith({
        region: 'us-east-1',
        accessKeyId: undefined,
        secretAccessKey: undefined,
      });
    });

    it('should handle AWS Lambda failure status', async () => {
      mockLambdaInvoke.mockResolvedValue({
        StatusCode: 500,
      });

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'error',
      });

      expect(result).toEqual({
        success: false,
        message: 'Notification failed: Lambda invocation failed with status: 500',
      });
    });

    it('should handle empty Lambda response payload', async () => {
      mockLambdaInvoke.mockResolvedValue({
        StatusCode: 200,
        Payload: '',
      });

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'success',
      });

      expect(result).toEqual({
        success: true,
        message: 'Email sent successfully',
      });
    });

    it('should handle AWS Lambda invocation error', async () => {
      mockLambdaInvoke.mockRejectedValue(new Error('AWS service error'));

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test',
        type: 'error',
      });

      expect(result).toEqual({
        success: false,
        message: 'Notification failed: AWS service error',
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status for local mode when service is accessible', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
        };
        return config[key] || defaultValue;
      });

      mockedAxios.get.mockResolvedValue({ status: 200 });

      const service = createService();
      const result = await service.healthCheck();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3003/health',
        { timeout: 5000 }
      );

      expect(result).toEqual({
        status: 'healthy',
        mode: 'local',
        endpoint: 'http://localhost:3003',
      });
    });

    it('should return unhealthy status for local mode when service is not accessible', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
        };
        return config[key] || defaultValue;
      });

      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const service = createService();
      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        mode: 'local',
        endpoint: 'http://localhost:3003',
      });
    });

    it('should return unhealthy status for local mode when service returns non-200 status', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
        };
        return config[key] || defaultValue;
      });

      mockedAxios.get.mockResolvedValue({ status: 500 });

      const service = createService();
      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        mode: 'local',
        endpoint: 'http://localhost:3003',
      });
    });

    it('should return configured status for AWS mode', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
        };
        return config[key] || defaultValue;
      });

      const service = createService();
      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'configured',
        mode: 'aws',
      });
    });

    it('should handle unknown error type in health check', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
        };
        return config[key] || defaultValue;
      });

      mockedAxios.get.mockRejectedValue('String error');

      const service = createService();
      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        mode: 'local',
        endpoint: 'http://localhost:3003',
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should log initialization message', () => {
      // Test that service initializes without error
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
          LAMBDA_FUNCTION_NAME: 'test-function',
        };
        return config[key] || defaultValue;
      });

      const testService = new NotificationService(configService);
      expect(testService).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should handle notification without optional parameters', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
        };
        return config[key] || defaultValue;
      });

      const mockResponse = {
        data: { message: 'Success' },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Test notification',
        type: 'success',
      });

      expect(result).toEqual({
        success: true,
        message: 'Success',
      });
    });

    it('should handle sendNotification with different payload types', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          LAMBDA_NOTIFICATION_URL: 'http://localhost:3003',
        };
        return config[key] || defaultValue;
      });

      const mockResponse = {
        data: { message: 'Error handled' },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const service = createService();
      const result = await service.sendNotification({
        to: 'test@example.com',
        subject: 'Error notification',
        type: 'error',
        username: 'Test User',
        filename: 'failed-video.mp4',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3003/invoke',
        expect.objectContaining({
          type: 'error',
          username: 'Test User',
          filename: 'failed-video.mp4',
        }),
        expect.any(Object)
      );

      expect(result).toEqual({
        success: true,
        message: 'Error handled',
      });
    });
  });
});