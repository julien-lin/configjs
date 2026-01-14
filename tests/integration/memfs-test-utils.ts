/**
 * Integration Test Utilities avec memfs
 * Remplace les fonctions de test-utils.ts pour utiliser memfs
 */

import {
  createMockProject,
  resetMockFs,
  getMockFsAdapter,
  readMockFile,
  writeMockFile,
  mockFileExists,
  getMockProjectRoot,
} from '../test-utils/fs-mock.js'
import type { Framework, PackageManager } from '../../src/types/index.js'
import { join, relative } from 'path'
import { clearDetectionCache } from '../../src/core/detector.js'

/**
 * Convertit un chemin absolu en chemin relatif au projet mock
 */
function toRelativePath(absolutePath: string): string {
  const mockRoot = getMockProjectRoot()
  // Si le chemin est déjà relatif ou ne commence pas par le root mock, le retourner tel quel
  if (!absolutePath.startsWith(mockRoot)) {
    return absolutePath
  }
  // Retirer le préfixe du projet mock
  const rel = relative(mockRoot, absolutePath)
  return rel || '.'
}

/**
 * Crée un projet de test en mémoire (remplace createTestProject)
 */
export function createTestProject(
  _name: string = 'test-project',
  framework: Framework = 'react',
  options: {
    typescript?: boolean
    packageManager?: PackageManager
  } = {}
): string {
  const { projectRoot } = createMockProject(framework, options)
  return projectRoot
}

/**
 * Nettoie le projet de test (remplace cleanupTestProject)
 */
export function cleanupTestProject(_projectPath: string): void {
  resetMockFs()
  clearDetectionCache() // Vider le cache de détection entre les tests
}

/**
 * Vérifie si un fichier existe dans le mock filesystem
 */
export function fileExists(filePath: string): boolean {
  return mockFileExists(toRelativePath(filePath))
}

/**
 * Lit le contenu d'un fichier depuis le mock filesystem
 */
export function readFile(filePath: string): string {
  return readMockFile(toRelativePath(filePath))
}

/**
 * Écrit un fichier dans le mock filesystem
 */
export function writeFile(filePath: string, content: string): void {
  writeMockFile(toRelativePath(filePath), content)
}

/**
 * Lit un package.json de test
 */
export function readPackageJson(projectPath: string): Record<string, any> {
  const content = readFile(join(projectPath, 'package.json'))
  return JSON.parse(content)
}

/**
 * Écrit un package.json de test
 */
export function writePackageJson(
  projectPath: string,
  pkg: Record<string, any>
): void {
  writeFile(join(projectPath, 'package.json'), JSON.stringify(pkg, null, 2))
}

/**
 * Récupère l'adaptateur filesystem pour passer aux fonctions core
 */
export function getFsAdapter() {
  return getMockFsAdapter()
}

/**
 * Configuration de test pour les tests d'intégration
 */
export interface IntegrationTestConfig {
  projectName?: string
  framework?: Framework
  typescript?: boolean
  packageManager?: PackageManager
}

/**
 * Vérifie la configuration du projet (remplace verifyProjectSetup)
 */
export function verifyProjectSetup(
  projectPath: string,
  expectedFiles: string[],
  expectedDeps: string[] = []
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  // Vérifier les fichiers
  for (const file of expectedFiles) {
    const exists = fileExists(join(projectPath, file))
    if (!exists) {
      errors.push(`Fichier manquant: ${file}`)
    }
  }

  // Vérifier les dépendances
  const pkg = readPackageJson(projectPath)
  const allDeps = {
    ...(pkg['dependencies'] || {}),
    ...(pkg['devDependencies'] || {}),
  }

  for (const dep of expectedDeps) {
    if (!(dep in allDeps)) {
      errors.push(`Dépendance manquante: ${dep}`)
    }
  }

  return Promise.resolve({
    valid: errors.length === 0,
    errors,
  })
}
