/**
 * A simple event emitter implementation with TypeScript type safety.
 */
export class EventEmitter {
  private events: Record<string, Array<(...args: unknown[]) => void>> = {};

  /**
   * Register an event handler
   * @param event The event name
   * @param handler The event handler function
   */
  public on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  /**
   * Unregister an event handler
   * @param event The event name
   * @param handler The event handler function to remove
   */
  public off(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter((h) => h !== handler);
  }

  /**
   * Emit an event with the provided arguments
   * @param event The event name
   * @param args Arguments to pass to the event handlers
   */
  public emit(event: string, ...args: unknown[]): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all event handlers
   */
  public removeAllListeners(): void {
    this.events = {};
  }

  /**
   * Get the number of listeners for an event
   * @param event The event name
   * @returns The number of listeners
   */
  public listenerCount(event: string): number {
    return this.events[event]?.length || 0;
  }
} 