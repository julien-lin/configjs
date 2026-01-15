import type { ProjectContext } from '../../types/index.js'
import { BackupManager } from '../../core/backup-manager.js'
import { ConfigWriter } from '../../core/config-writer.js'

export interface PluginServices {
  backupManager: BackupManager
  writer: ConfigWriter
}

export function getPluginServices(ctx: ProjectContext): PluginServices {
  const backupManager = ctx.backupManager ?? new BackupManager(ctx.fsAdapter)
  const writer =
    ctx.configWriter ?? new ConfigWriter(backupManager, ctx.fsAdapter)
  return { backupManager, writer }
}

export function getRollbackManager(ctx: ProjectContext): BackupManager {
  return ctx.backupManager ?? new BackupManager(ctx.fsAdapter)
}
