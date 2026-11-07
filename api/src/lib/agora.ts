// @ts-ignore
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const AGORA_APP_ID = process.env.AGORA_APP_ID || 'test_agora_app_id';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'test_agora_certificate';

/**
 * Generate an RTC token for Agora Video/Audio consultations
 * @param channelName Appointment channel ID
 * @param uid Numeric user ID or 0 for dynamic
 * @param role Publisher or Subscriber
 * @param expireTimeInSeconds Expiration time (default 2 hours)
 */
export function generateAgoraRtcToken(
  channelName: string,
  uid: number = 0,
  role: number = RtcRole.PUBLISHER,
  expireTimeInSeconds: number = 7200
): { token: string; appId: string; channelName: string; uid: number } {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireTimeInSeconds;

  let token = '';
  try {
    token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );
  } catch (error) {
    console.warn('[Agora] Fallback to simulated token (invalid app certificate/dev mode):', error);
    token = `simulated_agora_token_${channelName}_${Date.now()}`;
  }

  return {
    token,
    appId: AGORA_APP_ID,
    channelName,
    uid,
  };
}
