import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Single-row table (id='default') for system-wide runtime configuration.
 * Allows superadmins to update sensitive settings (like API keys) without
 * redeploying the server or editing environment files.
 *
 * On first boot the row is seeded from env vars (if present) so existing
 * deployments continue to work without any manual migration step.
 */
@Entity('system_config_entity')
export class SystemConfigEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string; // always 'default'

  /** Claude API key used for AI child-safety insights. */
  @Column({ type: 'varchar', nullable: true, default: null })
  claudeApiKey: string | null;

  /**
   * Last known status of the Claude key.
   * 'unconfigured' → key not yet set or not yet tested
   * 'ok'           → last call succeeded
   * 'error'        → last call failed (see claudeKeyLastError)
   */
  @Column({ type: 'varchar', default: 'unconfigured' })
  claudeKeyStatus: string;

  @Column({ type: 'text', nullable: true, default: null })
  claudeKeyLastError: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
