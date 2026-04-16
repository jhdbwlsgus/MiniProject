export interface NotificationService {
  send(to: string, subject: string, content: string): Promise<void>;
}

export const NOTIFICATION_SERVICE = 'NotificationService';