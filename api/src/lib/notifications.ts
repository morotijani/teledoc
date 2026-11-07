import axios from 'axios';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function sendPushNotification(
  expoPushToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  if (!expoPushToken) {
    console.log(`[Push Notification] No token found. Skipped notification: "${title}" - "${body}"`);
    return false;
  }

  // If token is standard Expo token (starts with ExponentPushToken or ExpoPushToken)
  if (expoPushToken.startsWith('ExponentPushToken') || expoPushToken.startsWith('ExpoPushToken')) {
    try {
      const response = await axios.post('https://exp.host/--/api/v2/push/send', {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      });
      return response.status === 200;
    } catch (error) {
      console.error('[Push Notification] Failed to send via Expo:', error);
      return false;
    }
  }

  console.log(`[Push Notification Simulation] Sent to ${expoPushToken}: [${title}] ${body}`);
  return true;
}
