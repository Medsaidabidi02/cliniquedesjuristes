import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

export const generateVideoKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateSecureVideoUrl = async (videoPath: string, userId: number): Promise<string> => {
  // Create a JWT token for video access
  const token = jwt.sign(
    { 
      videoPath, 
      userId, 
      exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60) // 4 hours
    },
    config.videoSecret
  );

  // Return secure streaming endpoint
  return `${config.apiUrl}/api/videos/stream/${token}`;
};

export const verifyVideoAccess = (token: string): { videoPath: string; userId: number } => {
  try {
    const decoded = jwt.verify(token, config.videoSecret) as any;
    return {
      videoPath: decoded.videoPath,
      userId: decoded.userId
    };
  } catch (error) {
    throw new Error('Invalid video access token');
  }
};

export const getVideoFile = (videoPath: string): string => {
  const fullPath = path.join(__dirname, '../../', videoPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error('Video file not found');
  }
  
  return fullPath;
};