/**
 * One-Tab Policy Implementation
 * Ensures only one browser tab can be logged in at a time
 * Uses localStorage events to detect and enforce single-tab access
 */

const TAB_ID_KEY = 'activeTabId';
const HEARTBEAT_KEY = 'tabHeartbeat';
const HEARTBEAT_INTERVAL = 2000; // 2 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds

let currentTabId: string | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let logoutCallback: (() => void) | null = null;

/**
 * Initialize one-tab policy for the current tab
 * @param onLogout Callback function to execute when another tab takes over
 */
export function initOneTabPolicy(onLogout: () => void): void {
  if (typeof window === 'undefined') return;

  logoutCallback = onLogout;
  currentTabId = generateTabId();
  
  console.log(`🔒 One-tab policy initialized for tab ${currentTabId.substring(0, 8)}`);

  // Claim this tab as the active one
  claimActiveTab();

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
 * Generate a unique ID for this tab
 */
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Claim this tab as the active tab
 */
function claimActiveTab(): void {
  if (!currentTabId) return;

  const previousTabId = localStorage.getItem(TAB_ID_KEY);
  
  if (previousTabId && previousTabId !== currentTabId) {
    console.log(`⚠️ Another tab (${previousTabId.substring(0, 8)}) was active. Taking over...`);
  }

  localStorage.setItem(TAB_ID_KEY, currentTabId);
  updateHeartbeat();
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
    // Check if we're still the active tab
    const activeTabId = localStorage.getItem(TAB_ID_KEY);
    
    if (activeTabId !== currentTabId) {
      console.warn(`⛔ Another tab (${activeTabId?.substring(0, 8)}) is now active. Logging out this tab...`);
      handleLogout();
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
    console.warn(`⛔ Tab ${event.newValue.substring(0, 8)} claimed active status. Logging out this tab...`);
    handleLogout();
    return;
  }

  // Check heartbeat from other tabs
  if (event.key === HEARTBEAT_KEY && event.newValue) {
    try {
      const heartbeat = JSON.parse(event.newValue);
      
      if (heartbeat.tabId !== currentTabId) {
        // Another tab is alive and active
        const activeTabId = localStorage.getItem(TAB_ID_KEY);
        
        if (activeTabId === currentTabId) {
          // We're marked as active but another tab is sending heartbeats
          // Check if the other tab's heartbeat is recent
          const timeSinceHeartbeat = Date.now() - heartbeat.timestamp;
          
          if (timeSinceHeartbeat < HEARTBEAT_TIMEOUT) {
            console.warn(`⛔ Tab ${heartbeat.tabId.substring(0, 8)} is active. Logging out this tab...`);
            handleLogout();
          }
        } else if (activeTabId === heartbeat.tabId) {
          // Another tab is correctly marked as active
          console.warn(`⛔ Tab ${heartbeat.tabId.substring(0, 8)} is the active tab. Logging out this tab...`);
          handleLogout();
        }
      }
    } catch (error) {
      console.error('Error parsing heartbeat:', error);
    }
  }
}

/**
 * Trigger logout for this tab
 */
function handleLogout(): void {
  console.log(`👋 One-tab policy triggered logout for tab ${currentTabId?.substring(0, 8)}`);
  
  // Store message for user (externalized for i18n)
  const ONE_TAB_LOGOUT_MESSAGE = 'Vous avez été déconnecté car vous avez ouvert une autre session dans un autre onglet.';
  sessionStorage.setItem('loginMessage', ONE_TAB_LOGOUT_MESSAGE);
  
  cleanup();
  
  // Call the logout callback
  if (logoutCallback) {
    logoutCallback();
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

export default {
  init: initOneTabPolicy,
  stop: stopOneTabPolicy
};
