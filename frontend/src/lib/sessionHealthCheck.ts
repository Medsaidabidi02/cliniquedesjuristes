import { api } from './api';

// Session ping interval in milliseconds (5 minutes)
const PING_INTERVAL = 5 * 60 * 1000;

// Debounce delay for ping requests (30 seconds)
const PING_DEBOUNCE = 30 * 1000;

let pingIntervalId: NodeJS.Timeout | null = null;
let lastPingTime: number = 0;
let isRunning = false;

/**
 * Start session health check pings
 * Sends periodic pings to keep session alive and detect stale sessions
 */
export function startSessionHealthCheck(): void {
  if (isRunning) {
    console.log('⚠️ Session health check already running');
    return;
  }

  console.log('💓 Starting session health check (ping every 5 minutes)');
  
  // Send initial ping immediately
  sendPing();
  
  // Then set up interval for periodic pings
  pingIntervalId = setInterval(() => {
    sendPing();
  }, PING_INTERVAL);
  
  isRunning = true;
}

/**
 * Stop session health check pings
 */
export function stopSessionHealthCheck(): void {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  
  isRunning = false;
  console.log('💔 Stopped session health check');
}

/**
 * Send a ping to the server to update session activity
 * Uses debouncing to prevent excessive pings
 */
async function sendPing(): Promise<void> {
  try {
    const now = Date.now();
    
    // Debounce: Skip ping if last ping was too recent
    if (now - lastPingTime < PING_DEBOUNCE) {
      console.log('⏭️ Skipping ping (debounced)');
      return;
    }
    
    lastPingTime = now;
    
    await api.post('/auth/session/ping', {});
    console.log('💓 Session ping successful');
  } catch (error: any) {
    console.warn('⚠️ Session ping failed:', error.message);
    
    // If ping fails due to auth error, session might be invalid
    // The API interceptor will handle this and trigger logout
    if (error.response?.status === 401) {
      console.log('🚫 Session ping got 401 - session likely expired');
      stopSessionHealthCheck();
    }
  }
}

/**
 * Check if health check is currently running
 */
export function isHealthCheckRunning(): boolean {
  return isRunning;
}
