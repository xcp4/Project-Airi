import { AppEventMap, EventCallback } from '../types';

class EventBus {
  private listeners: { [K in keyof AppEventMap]?: EventCallback<any>[] } = {};

  public subscribe<K extends keyof AppEventMap>(
    event: K,
    callback: EventCallback<AppEventMap[K]>
  ): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);

    // Return an unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event]!.filter(
        (cb) => cb !== callback
      );
    };
  }

  public publish<K extends keyof AppEventMap>(
    event: K,
    data: AppEventMap[K]
  ): void {
    if (!this.listeners[event]) return;
    this.listeners[event]!.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in event handler for "${event}":`, err);
      }
    });
  }
}

export const eventBus = new EventBus();
