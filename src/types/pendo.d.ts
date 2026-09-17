// Type declaration for the Pendo analytics agent (loaded via snippet in the host page).
interface PendoAgent {
  track(eventName: string, metadata?: Record<string, string | number | boolean>): void;
}

declare var pendo: PendoAgent | undefined;
