import { readFile, pathExists } from 'fs-extra'
import { join, resolve, relative } from 'path'
import { createHash } from 'crypto'
import { pluginRegistry } from '../../plugins/registry.js'
import {
  CompatibilityValidator,
  allCompatibilityRules,
} from '../../core/validator.js'
import { logger } from '../../utils/logger.js'
import { ConfigSanitizer } from '../../core/config-sanitizer.js'
import {
  validatePathInProjectWithSymlinks,
  getPathValidationErrorMessage,
} from '../../core/path-validator.js'

interface ConfigFile {
  plugins: string[]
}

function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

function parseConfigFile(content: string): ConfigFile {
  const parsed = ConfigSanitizer.validateJSON(content)
  const plugins = parsed['plugins']

  if (!Array.isArray(plugins)) {
    throw new Error(
      'Le champ "plugins" doit être un tableau de noms de packages'
    )
  }

  const normalizedPlugins = plugins.filter(
    (plugin): plugin is string => typeof plugin === 'string'
  )

  if (normalizedPlugins.length !== plugins.length) {
    throw new Error('Le champ "plugins" doit contenir uniquement des chaînes')
  }

  return { plugins: normalizedPlugins }
}

async function readConfigFileSafely(
  configPath: string,
  projectRoot: string
): Promise<ConfigFile> {
  const resolvedRoot = resolve(projectRoot)
  const resolvedConfigPath = resolve(configPath)
  const relativePath = relative(resolvedRoot, resolvedConfigPath)

  let safePath = resolvedConfigPath
  try {
    safePath = await validatePathInProjectWithSymlinks(
      resolvedRoot,
      relativePath
    )
  } catch (error) {
    const errorMessage = getPathValidationErrorMessage(error)
    throw new Error(`Chemin de config invalide: ${errorMessage}`)
  }

  if (!(await pathExists(safePath))) {
    throw new Error(`Fichier de configuration introuvable: ${safePath}`)
  }

  const firstRead = await readFile(safePath, 'utf-8')
  const firstHash = hashContent(firstRead)
  const secondRead = await readFile(safePath, 'utf-8')
  const secondHash = hashContent(secondRead)

  if (firstHash !== secondHash) {
    throw new Error(
      'Le fichier de configuration a changé pendant la lecture (TOCTOU détecté). Relancez la commande.'
    )
  }

  return parseConfigFile(firstRead)
}

/**
 * Commande pour vérifier la compatibilité sans installer
 *
 * @param options - Options de la commande
 */
export async function checkCompatibility(options: {
  config?: string
}): Promise<void> {
  try {
    logger.header('Vérification de la compatibilité')

    // 1. Lire le fichier de configuration
    const configPath = options.config || join(process.cwd(), '.confjs.json')

    let config: ConfigFile
    try {
      config = await readConfigFileSafely(configPath, process.cwd())
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error(
        `Erreur de lecture du fichier de configuration: ${errorMessage}`
      )
      logger.info('Créez un fichier .confjs.json avec le format suivant:')
      logger.info(
        JSON.stringify(
          {
            plugins: ['react-router-dom', 'zustand', 'tailwindcss'],
          },
          null,
          2
        )
      )
      process.exit(1)
    }

    if (!config.plugins || !Array.isArray(config.plugins)) {
      logger.error('Format de configuration invalide')
      logger.info('Le champ "plugins" doit être un tableau de noms de packages')
      process.exit(1)
    }

    // 2. Résoudre les plugins
    const selectedPlugins = config.plugins
      .map((name) => pluginRegistry.find((p) => p.name === name))
      .filter(Boolean)

    if (selectedPlugins.length === 0) {
      logger.error('Aucun plugin valide trouvé dans la configuration')
      process.exit(1)
    }

    const notFound = config.plugins.filter(
      (name) => !pluginRegistry.find((p) => p.name === name)
    )
    if (notFound.length > 0) {
      logger.warn('Plugins non trouvés:')
      for (const name of notFound) {
        logger.item(name, 'yellow')
      }
    }

    logger.section(`Plugins à vérifier: ${selectedPlugins.length}`)
    for (const plugin of selectedPlugins) {
      if (plugin) {
        logger.item(`${plugin.displayName} (${plugin.name})`, 'blue')
      }
    }

    // 3. Validation
    logger.section('Analyse de compatibilité...')

    const validator = new CompatibilityValidator(allCompatibilityRules)
    const validation = validator.validate(
      selectedPlugins as typeof pluginRegistry
    )

    // 4. Afficher les résultats
    if (validation.errors.length === 0) {
      logger.success('Aucun conflit détecté')
    } else {
      logger.error('Conflits détectés:')
      for (const error of validation.errors) {
        logger.item(error.message, 'yellow')
        if ('plugins' in error && error.plugins) {
          logger.dim(`Plugins: ${error.plugins.join(', ')}`)
        }
      }
    }

    if (validation.warnings.length > 0) {
      logger.warn('Avertissements:')
      for (const warning of validation.warnings) {
        logger.item(warning.message, 'yellow')
        if ('plugins' in warning && warning.plugins) {
          logger.dim(`Plugins: ${warning.plugins.join(', ')}`)
        }
      }
    }

    if (validation.suggestions.length > 0) {
      logger.info('Suggestions:')
      for (const suggestion of validation.suggestions) {
        logger.item(suggestion, 'blue')
      }
    }

    // 5. Résultat final
    if (validation.valid) {
      logger.success(
        "Configuration valide. Vous pouvez procéder à l'installation."
      )
      process.exit(0)
    } else {
      logger.error(
        "Configuration invalide. Corrigez les erreurs avant d'installer."
      )
      process.exit(2)
    }
  } catch (error) {
    logger.error('Erreur lors de la vérification:', error)
    process.exit(1)
  }
}
