import { WebClient } from '@slack/web-api';
import { prisma } from '../../models/prisma';
import { config } from '../../config/env';
import { encrypt, decrypt } from '../../utils/crypto';
import { logger } from '../../config/logger';

export class SlackService {
  public isConfigured(): boolean {
    return Boolean(config.SLACK_CLIENT_ID && config.SLACK_CLIENT_SECRET);
  }

  /**
   * Generates real Slack OAuth authorization URL.
   */
  public getAuthorizeUrl(state?: string): string {
    if (!this.isConfigured()) {
      throw new Error(
        'Slack OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in .env'
      );
    }

    const scopes = ['chat:write', 'chat:write.public', 'channels:read', 'incoming-webhook'];
    const params = new URLSearchParams({
      client_id: config.SLACK_CLIENT_ID,
      scope: scopes.join(','),
      redirect_uri: config.SLACK_REDIRECT_URI,
      state: state || '',
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges OAuth authorization code for Slack access token, encrypts it, and saves in database.
   */
  public async handleCallback(code: string, userId: string): Promise<void> {
    const client = new WebClient();

    const response = await client.oauth.v2.access({
      client_id: config.SLACK_CLIENT_ID,
      client_secret: config.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: config.SLACK_REDIRECT_URI,
    });

    if (!response.ok || !response.access_token) {
      throw new Error(`Slack OAuth exchange failed: ${response.error || 'Unknown error'}`);
    }

    const encryptedToken = encrypt(response.access_token);
    const teamId = response.team?.id || 'unknown';
    const teamName = response.team?.name || 'Slack Workspace';
    const channelId = response.incoming_webhook?.channel_id || null;

    await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        accessToken: encryptedToken,
        teamId,
        teamName,
        channelId,
        connected: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        accessToken: encryptedToken,
        teamId,
        teamName,
        channelId,
        connected: true,
      },
    });

    logger.info({ userId, teamName, teamId }, 'Slack connected and token encrypted at rest');
  }

  /**
   * Sends a real rate-limit notification to the user's Slack workspace.
   */
  public async sendRateLimitAlert(
    userId: string,
    senderEmail: string,
    limit: number,
    nextWindow: Date
  ): Promise<void> {
    try {
      const connection = await prisma.slackConnection.findUnique({
        where: { userId },
      });

      if (!connection || !connection.connected || !connection.accessToken) {
        logger.debug({ userId }, 'Slack is not connected for user; skipping rate limit alert');
        return;
      }

      const decryptedToken = decrypt(connection.accessToken);
      const client = new WebClient(decryptedToken);

      const formattedWindow = nextWindow.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      const messageText = `⚠️ *Email Rate Limit Reached* for sender \`${senderEmail}\`.\n${limit} emails have been sent in the current hour.\nRemaining scheduled emails have been safely delayed to the next available window (*${formattedWindow}*).`;

      // Post to channel if stored, or find default general/first channel
      let targetChannel = connection.channelId;

      if (!targetChannel) {
        const convList = await client.conversations.list({
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 10,
        });
        const channels = convList.channels || [];
        const general = channels.find((c) => c.name === 'general') || channels[0];
        targetChannel = general?.id || null;
      }

      if (targetChannel) {
        await client.chat.postMessage({
          channel: targetChannel,
          text: messageText,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚨 *Outbox Labs Rate Limit Alert*\nEmail sending limit reached for *${senderEmail}*.`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Hourly Limit:*\n${limit} emails/hr`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Next Sending Window:*\n${formattedWindow}`,
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: 'Remaining emails remain scheduled in queue and will not be lost.',
                },
              ],
            },
          ],
        });

        logger.info(
          { userId, senderEmail, channel: targetChannel },
          'Real Slack rate-limit alert sent successfully'
        );
      } else {
        logger.warn({ userId }, 'No valid Slack channel found to post rate limit alert');
      }
    } catch (err: any) {
      logger.error(
        { userId, senderEmail, err: err?.message || err },
        'Failed to send Slack rate limit alert'
      );
    }
  }

  /**
   * Retrieves connection status for a user.
   */
  public async getStatus(userId: string) {
    const conn = await prisma.slackConnection.findUnique({
      where: { userId },
      select: {
        connected: true,
        teamName: true,
        teamId: true,
        updatedAt: true,
      },
    });

    return {
      configured: this.isConfigured(),
      connected: Boolean(conn?.connected),
      teamName: conn?.teamName,
      teamId: conn?.teamId,
      updatedAt: conn?.updatedAt,
    };
  }

  /**
   * Disconnects Slack for a user.
   */
  public async disconnect(userId: string): Promise<void> {
    await prisma.slackConnection.updateMany({
      where: { userId },
      data: { connected: false },
    });
    logger.info({ userId }, 'Slack connection disabled for user');
  }
}

export const slackService = new SlackService();
