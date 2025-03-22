import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { storage } from '../../config/cloudinary';

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('Cloudinary Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables for each test
    process.env = { ...originalEnv };
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should configure cloudinary with environment variables', () => {
    // Re-import the cloudinary config to trigger the configuration
    jest.isolateModules(() => {
      require('../../config/cloudinary');
    });
    expect((cloudinary as any).config).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'test-key',
      api_secret: 'test-secret',
    });
  });

  it('should create CloudinaryStorage with correct parameters', () => {
    expect(storage).toBeInstanceOf(CloudinaryStorage);
    // Test the storage configuration by checking its properties
    expect(storage).toHaveProperty('cloudinary');
    expect(storage).toHaveProperty('params');
  });
}); 