/// <reference types="react-scripts" />

declare module 'scheduler' {
    export interface CallbackNode {
      callback: (() => void) | null;
      priorityLevel: number;
      startTime: number;
      expirationTime: number;
      next: CallbackNode | null;
      previous: CallbackNode | null;
    }
  
    export function unstable_scheduleCallback(
      priorityLevel: number,
      callback: () => void,
      options?: { delay?: number }
    ): CallbackNode;
  
    export function unstable_cancelCallback(callbackNode: CallbackNode): void;
    export function unstable_shouldYield(): boolean;
    export function unstable_requestPaint(): void;
    export function unstable_getCurrentPriorityLevel(): number;
    export function unstable_getFirstCallbackNode(): CallbackNode | null;
    export function unstable_forceFrameRate(fps: number): void;
  
    export function unstable_runWithPriority<T>(
      priorityLevel: number,
      eventHandler: () => T
    ): T;
  
    export function unstable_next<T>(eventHandler: () => T): T;
    export function unstable_wrapCallback<T extends (...args: any[]) => any>(
      callback: T
    ): T;
  
    export const unstable_ImmediatePriority: number;
    export const unstable_UserBlockingPriority: number;
    export const unstable_NormalPriority: number;
    export const unstable_LowPriority: number;
    export const unstable_IdlePriority: number;
  }
  
  declare module 'scheduler/tracing' {
    export function unstable_trace<T>(
      name: string,
      timestamp: number,
      callback: () => T
    ): T;
  
    export function unstable_wrap<T extends (...args: any[]) => any>(
      callback: T
    ): T;
  
    export function unstable_clear(callback: () => void): void;
  }