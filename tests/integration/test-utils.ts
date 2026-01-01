/**
 * Integration Test Utilities
 * Fournit des helpers pour tester les flows d'installation réels
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

/**
 * Crée un répertoire temporaire isolé pour les tests
 */
export async function createTestProject(
    name: string = 'test-project'
): Promise<string> {
    const tmpPath = tmpdir()
    const testId = randomBytes(8).toString('hex')
    const projectPath = join(tmpPath, `confjs-test-${testId}-${name}`)

    await fs.mkdir(projectPath, { recursive: true })

    // Initialiser package.json minimal
    await fs.writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(
            {
                name,
                version: '0.1.0',
                type: 'module',
                dependencies: {
                    react: '^18.2.0',
                    'react-dom': '^18.2.0',
                },
            },
            null,
            2
        )
    )

    // Créer structure de base
    await fs.mkdir(join(projectPath, 'src'), { recursive: true })
    await fs.writeFile(
        join(projectPath, 'src', 'index.tsx'),
        "console.log('Hello from test project')"
    )

    return projectPath
}

/**
 * Nettoie un répertoire de test
 */
export async function cleanupTestProject(projectPath: string): Promise<void> {
    try {
        await fs.rm(projectPath, { recursive: true, force: true })
    } catch (error) {
        console.error(`Erreur lors du cleanup de ${projectPath}:`, error)
    }
}

/**
 * Vérifie si un fichier existe
 */
export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

/**
 * Lit le contenu d'un fichier
 */
export async function readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8')
}

/**
 * Écrit dans un fichier
 */
export async function writeFile(
    filePath: string,
    content: string
): Promise<void> {
    return fs.writeFile(filePath, content, 'utf-8')
}

/**
 * Lit un package.json de test
 */
export async function readPackageJson(
    projectPath: string
): Promise<Record<string, any>> {
    const content = await readFile(join(projectPath, 'package.json'))
    return JSON.parse(content)
}

/**
 * Vérifie qu'une dépendance est installée dans package.json
 */
export async function hasDependency(
    projectPath: string,
    packageName: string,
    isDev: boolean = false
): Promise<boolean> {
    const pkg = await readPackageJson(projectPath)
    const section = isDev ? 'devDependencies' : 'dependencies'
    return packageName in (pkg[section] || {})
}

/**
 * Vérifie que plusieurs fichiers existent
 */
export async function filesExist(
    projectPath: string,
    filePaths: string[]
): Promise<boolean> {
    const results = await Promise.all(
        filePaths.map((fp) => fileExists(join(projectPath, fp)))
    )
    return results.every((r) => r === true)
}

/**
 * Récupère la liste des fichiers créés/modifiés
 */
export async function getProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = []

    async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
            const fullPath = join(dir, entry.name)
            const relativePath = fullPath.replace(projectPath, '').slice(1)

            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                    await walk(fullPath)
                }
            } else {
                files.push(relativePath)
            }
        }
    }

    await walk(projectPath)
    return files.sort()
}

/**
 * Configuration pour un test d'intégration
 */
export interface IntegrationTestConfig {
    projectName?: string
    timeout?: number
    verbose?: boolean
}

/**
 * Wrapper pour les tests d'intégration avec setup/teardown
 */
export async function runIntegrationTest(
    testName: string,
    testFn: (projectPath: string) => Promise<void>,
    config: IntegrationTestConfig = {}
): Promise<void> {
    const projectPath = await createTestProject(
        config.projectName || 'test-project'
    )

    try {
        if (config.verbose) {
            console.log(`[${testName}] Projet créé: ${projectPath}`)
        }

        await testFn(projectPath)

        if (config.verbose) {
            console.log(`[${testName}] ✅ Test réussi`)
        }
    } finally {
        await cleanupTestProject(projectPath)
        if (config.verbose) {
            console.log(`[${testName}] Nettoyage terminé`)
        }
    }
}

/**
 * Vérifie que le projet a été configuré correctement
 */
export async function verifyProjectSetup(
    projectPath: string,
    expectedFiles: string[],
    expectedDeps: string[] = []
): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Vérifier les fichiers
    for (const file of expectedFiles) {
        const exists = await fileExists(join(projectPath, file))
        if (!exists) {
            errors.push(`Fichier manquant: ${file}`)
        }
    }

    // Vérifier les dépendances
    const pkg = await readPackageJson(projectPath)
    const allDeps = {
        ...(pkg['dependencies'] || {}),
        ...(pkg['devDependencies'] || {}),
    }

    for (const dep of expectedDeps) {
        if (!(dep in allDeps)) {
            errors.push(`Dépendance manquante: ${dep}`)
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}
