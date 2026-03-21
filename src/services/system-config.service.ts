import { AppDataSource } from '../database';
import { SystemConfigEntity } from '../entities/SystemConfig';

const repo = () => AppDataSource.getRepository(SystemConfigEntity);

class SystemConfigService {
  /** Returns (or seeds) the single system config row. */
  async getConfig(): Promise<SystemConfigEntity> {
    let config = await repo().findOne({ where: { id: 'default' } });
    if (!config) {
      // Seed from env vars on first access so existing deployments don't break
      config = await repo().save(
        repo().create({
          id: 'default',
          claudeApiKey: process.env.ANTHROPIC_API_KEY || null,
          claudeKeyStatus: 'unconfigured',
          claudeKeyLastError: null,
        }),
      );
    }
    return config;
  }

  /** Returns the Claude key — DB row first, env var fallback. */
  async getClaudeKey(): Promise<string | null> {
    const config = await this.getConfig();
    return config.claudeApiKey || process.env.ANTHROPIC_API_KEY || null;
  }

  async updateConfig(patch: { claudeApiKey?: string }): Promise<SystemConfigEntity> {
    const config = await this.getConfig();
    if (patch.claudeApiKey !== undefined) {
      config.claudeApiKey = patch.claudeApiKey || null;
      // Reset status so the next AI call re-validates the new key
      config.claudeKeyStatus = 'unconfigured';
      config.claudeKeyLastError = null;
    }
    return repo().save(config);
  }

  async recordClaudeSuccess(): Promise<void> {
    const config = await this.getConfig();
    if (config.claudeKeyStatus !== 'ok') {
      config.claudeKeyStatus = 'ok';
      config.claudeKeyLastError = null;
      await repo().save(config);
    }
  }

  async recordClaudeError(message: string): Promise<void> {
    const config = await this.getConfig();
    config.claudeKeyStatus = 'error';
    config.claudeKeyLastError = message;
    await repo().save(config);
  }
}

export const systemConfigService = new SystemConfigService();
