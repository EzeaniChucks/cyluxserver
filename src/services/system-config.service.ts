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
          geminiApiKey: process.env.GEMINI_API_KEY || null,
          geminiKeyStatus: process.env.GEMINI_API_KEY ? 'unconfigured' : 'unconfigured',
          geminiKeyLastError: null,
        }),
      );
    }
    return config;
  }

  /** Returns the Gemini key — DB row first, env var fallback. */
  async getGeminiKey(): Promise<string | null> {
    const config = await this.getConfig();
    return config.geminiApiKey || process.env.GEMINI_API_KEY || null;
  }

  async updateConfig(patch: { geminiApiKey?: string }): Promise<SystemConfigEntity> {
    const config = await this.getConfig();
    if (patch.geminiApiKey !== undefined) {
      config.geminiApiKey = patch.geminiApiKey || null;
      // Reset status so the next AI call re-validates the new key
      config.geminiKeyStatus = 'unconfigured';
      config.geminiKeyLastError = null;
    }
    return repo().save(config);
  }

  async recordGeminiSuccess(): Promise<void> {
    const config = await this.getConfig();
    if (config.geminiKeyStatus !== 'ok') {
      config.geminiKeyStatus = 'ok';
      config.geminiKeyLastError = null;
      await repo().save(config);
    }
  }

  async recordGeminiError(message: string): Promise<void> {
    const config = await this.getConfig();
    config.geminiKeyStatus = 'error';
    config.geminiKeyLastError = message;
    await repo().save(config);
  }
}

export const systemConfigService = new SystemConfigService();
