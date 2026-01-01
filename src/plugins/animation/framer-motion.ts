import { join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'
import { ensureDirectory } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin Framer Motion
 *
 * Animations React
 * Documentation officielle : https://www.framer.com/motion
 *
 * @example
 * ```typescript
 * import { framerMotionPlugin } from './plugins/animation/framer-motion'
 * await framerMotionPlugin.install(ctx)
 * await framerMotionPlugin.configure(ctx)
 * ```
 */
export const framerMotionPlugin: Plugin = {
  name: 'framer-motion',
  displayName: 'Framer Motion',
  description: 'Animations React',
  category: Category.UI,
  version: '^11.11.17',

  frameworks: ['react'],

  /**
   * Détecte si Framer Motion est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['framer-motion'] !== undefined ||
      ctx.devDependencies['framer-motion'] !== undefined
    )
  },

  /**
   * Installe Framer Motion
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('Framer Motion is already installed')
      return {
        packages: {},
        success: true,
        message: 'Framer Motion already installed',
      }
    }

    try {
      const packages: string[] = ['framer-motion']

      await installPackages(packages, {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed Framer Motion')

      return {
        packages: {
          dependencies: packages,
        },
        success: true,
        message: `Installed Framer Motion: ${packages.join(', ')}`,
      }
    } catch (error) {
      logger.error('Failed to install Framer Motion:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install Framer Motion: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure Framer Motion dans le projet
   *
   * Crée :
   * - src/components/animation/AnimatedBox.tsx (ou .jsx) : Exemple d'animation
   * - src/components/animation/index.ts (ou .js) : Export centralisé
   *
   * Documentation : https://www.framer.com/motion
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = join(ctx.projectRoot, ctx.srcDir)

    try {
      // 1. Créer le dossier components/animation si nécessaire
      const animationDir = join(srcDir, 'components', 'animation')
      await ensureDirectory(animationDir)

      // 2. Créer src/components/animation/AnimatedBox.tsx (exemple)
      const animatedBoxPath = join(
        animationDir,
        `AnimatedBox.${ctx.typescript ? 'tsx' : 'jsx'}`
      )
      const animatedBoxContent = ctx.typescript
        ? getAnimatedBoxContentTS()
        : getAnimatedBoxContentJS()

      await writer.createFile(animatedBoxPath, animatedBoxContent)
      files.push({
        type: 'create',
        path: animatedBoxPath,
        content: animatedBoxContent,
        backup: false,
      })

      logger.info(`Created animated box example: ${animatedBoxPath}`)

      // 3. Créer src/components/animation/index.ts (export centralisé)
      const indexPath = join(
        animationDir,
        `index.${ctx.typescript ? 'ts' : 'js'}`
      )
      const indexContent = ctx.typescript
        ? getIndexContentTS()
        : getIndexContentJS()

      await writer.createFile(indexPath, indexContent)
      files.push({
        type: 'create',
        path: indexPath,
        content: indexContent,
        backup: false,
      })

      logger.info(`Created animation index: ${indexPath}`)

      return {
        files,
        success: true,
        message: 'Framer Motion configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure Framer Motion:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure Framer Motion: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration Framer Motion
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('Framer Motion configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback Framer Motion configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu de l'exemple AnimatedBox (TypeScript)
 */
function getAnimatedBoxContentTS(): string {
  return `import { motion } from 'framer-motion'

/**
 * Exemple de composant animé avec Framer Motion
 * 
 * Documentation : https://www.framer.com/motion
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { AnimatedBox } from './components/animation'
 * 
 * function App() {
 *   return <AnimatedBox />
 * }
 * \`\`\`
 */
export function AnimatedBox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: 200,
        height: 200,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        cursor: 'pointer',
      }}
    >
      <motion.p
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        Animated Box
      </motion.p>
    </motion.div>
  )
}
`
}

/**
 * Contenu de l'exemple AnimatedBox (JavaScript)
 */
function getAnimatedBoxContentJS(): string {
  return `import { motion } from 'framer-motion'

/**
 * Exemple de composant animé avec Framer Motion
 * 
 * Documentation : https://www.framer.com/motion
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export function AnimatedBox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: 200,
        height: 200,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        cursor: 'pointer',
      }}
    >
      <motion.p
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        Animated Box
      </motion.p>
    </motion.div>
  )
}
`
}

/**
 * Contenu de l'index (TypeScript)
 */
function getIndexContentTS(): string {
  return `export { AnimatedBox } from './AnimatedBox'
`
}

/**
 * Contenu de l'index (JavaScript)
 */
function getIndexContentJS(): string {
  return `export { AnimatedBox } from './AnimatedBox'
`
}
