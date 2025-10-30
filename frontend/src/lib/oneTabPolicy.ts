/**
 * One-Tab Policy Implementation
 * Shows a React component when multiple tabs are open
 * Uses localStorage events to detect multiple tabs
 */

const TAB_ID_KEY = 'activeTabId';
const HEARTBEAT_KEY = 'tabHeartbeat';
const HEARTBEAT_INTERVAL = 2000; // 2 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds

let currentTabId: string | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let isActiveTab: boolean = true;

// Callback to notify when tab becomes inactive
let onInactiveCallback: (() => void) | null = null;

/**
 * Initialize one-tab policy for the current tab
 * @param onInactive Callback function to execute when tab becomes inactive
 */
export function initOneTabPolicy(onInactive?: () => void): void {
  if (typeof window === 'undefined') return;

  currentTabId = generateTabId();
  onInactiveCallback = onInactive || null;
  
  console.log(`🔒 One-tab policy initialized for tab ${currentTabId.substring(0, 8)}`);

  // Check if another tab is already active
  checkAndClaimActiveTab();

  // Start heartbeat to maintain active status
  startHeartbeat();

  // Listen for localStorage changes from other tabs
  window.addEventListener('storage', handleStorageChange);

  // Clean up on page unload
  window.addEventListener('beforeunload', cleanup);
}

/**
 * Stop one-tab policy for the current tab
 */
export function stopOneTabPolicy(): void {
  if (typeof window === 'undefined') return;

  console.log(`🔓 One-tab policy stopped for tab ${currentTabId?.substring(0, 8)}`);

  cleanup();
  
  window.removeEventListener('storage', handleStorageChange);
  window.removeEventListener('beforeunload', cleanup);
}

/**
 * Check if current tab is active
 */
export function isCurrentTabActive(): boolean {
  return isActiveTab;
}

/**
 * Generate a unique ID for this tab
 */
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if another tab is active and claim if not
 */
function checkAndClaimActiveTab(): void {
  if (!currentTabId) return;

  const existingTabId = localStorage.getItem(TAB_ID_KEY);
  const existingHeartbeat = localStorage.getItem(HEARTBEAT_KEY);
  
  if (existingTabId && existingTabId !== currentTabId && existingHeartbeat) {
    try {
      const heartbeat = JSON.parse(existingHeartbeat);
      const timeSinceHeartbeat = Date.now() - heartbeat.timestamp;
      
      // If another tab is actively sending heartbeats, this tab is inactive
      if (timeSinceHeartbeat < HEARTBEAT_TIMEOUT) {
        console.log(`⚠️ Another tab (${existingTabId.substring(0, 8)}) is active. This tab is inactive.`);
        isActiveTab = false;
        notifyInactive();
        return;
      }
    } catch (e) {
      console.error('Error parsing heartbeat:', e);
    }
  }

  // No other active tab, claim this one as active
  isActiveTab = true;
  localStorage.setItem(TAB_ID_KEY, currentTabId);
  updateHeartbeat();
}

/**
 * Notify that tab is inactive
 */
function notifyInactive(): void {
  if (onInactiveCallback) {
    onInactiveCallback();
  }
}

/**
 * Update the heartbeat timestamp
 */
function updateHeartbeat(): void {
  if (!currentTabId) return;
  
  const heartbeat = {
    tabId: currentTabId,
    timestamp: Date.now()
  };
  
  localStorage.setItem(HEARTBEAT_KEY, JSON.stringify(heartbeat));
}

/**
 * Start heartbeat interval to maintain active status
 */
function startHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (!isActiveTab) {
      // Don't send heartbeat if this tab is not active
      return;
    }

    // Check if we're still the active tab
    const activeTabId = localStorage.getItem(TAB_ID_KEY);
    
    if (activeTabId !== currentTabId) {
      console.warn(`⚠️ Another tab (${activeTabId?.substring(0, 8)}) is now active. This tab is inactive.`);
      isActiveTab = false;
      notifyInactive();
      return;
    }

    // Update our heartbeat
    updateHeartbeat();
  }, HEARTBEAT_INTERVAL);
}

/**
 * Handle localStorage changes from other tabs
 */
function handleStorageChange(event: StorageEvent): void {
  if (!currentTabId) return;

  // Another tab claimed to be active
  if (event.key === TAB_ID_KEY && event.newValue && event.newValue !== currentTabId) {
    console.warn(`⚠️ Tab ${event.newValue.substring(0, 8)} claimed active status. This tab is now inactive.`);
    isActiveTab = false;
    notifyInactive();
    return;
  }

  // Check heartbeat from other tabs
  if (event.key === HEARTBEAT_KEY && event.newValue) {
    try {
      const heartbeat = JSON.parse(event.newValue);
      
      if (heartbeat.tabId !== currentTabId) {
        // Another tab is alive and active
        const activeTabId = localStorage.getItem(TAB_ID_KEY);
        
        if (activeTabId === heartbeat.tabId && activeTabId !== currentTabId) {
          // Another tab is correctly marked as active
          console.warn(`⚠️ Tab ${heartbeat.tabId.substring(0, 8)} is the active tab. This tab is inactive.`);
          isActiveTab = false;
          notifyInactive();
        }
      }
    } catch (error) {
      console.error('Error parsing heartbeat:', error);
    }
  }
}

/**
 * Clean up resources
 */
function cleanup(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  // Only remove our entries if we're the active tab
  const activeTabId = localStorage.getItem(TAB_ID_KEY);
  if (activeTabId === currentTabId) {
    localStorage.removeItem(TAB_ID_KEY);
    localStorage.removeItem(HEARTBEAT_KEY);
  }
}

const oneTabPolicy = {
  init: initOneTabPolicy,
  stop: stopOneTabPolicy
};

export default oneTabPolicy;
