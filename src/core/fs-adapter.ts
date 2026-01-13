/**
 * Adaptateur de système de fichiers
 *
 * Permet d'utiliser soit le filesystem réel (fs-extra), soit un filesystem simulé (memfs).
 * Cette abstraction permet de rendre le code filesystem-agnostic pour les tests.
 *
 * @example
 * ```typescript
 * // Utilisation avec fs-extra (par défaut)
 * const adapter = new FileSystemAdapter()
 * const content = await adapter.readFile('/path/to/file.txt')
 *
 * // Utilisation avec memfs (pour les tests)
 * import { createFsFromVolume, Volume } from 'memfs'
 * const volume = new Volume()
 * const memfs = createFsFromVolume(volume)
 * const adapter = new FileSystemAdapter(memfs)
 * const content = await adapter.readFile('/path/to/file.txt')
 * ```
 */

import type { IFs } from 'memfs'
import fs from 'fs-extra'
import { resolve, dirname } from 'path'

/**
 * Interface pour l'adaptateur de filesystem
 *
 * Fournit une API unifiée pour les opérations filesystem,
 * compatible avec fs-extra et memfs.
 */
export interface IFsAdapter {
    /**
     * Lit un fichier de manière asynchrone
     */
    readFile(
        path: string,
        encoding?: BufferEncoding | null
    ): Promise<string>

    /**
     * Écrit un fichier de manière asynchrone
     */
    writeFile(
        path: string,
        content: string,
        encoding?: BufferEncoding | null
    ): Promise<void>

    /**
     * Crée un répertoire (récursivement)
     */
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>

    /**
     * Liste les fichiers d'un répertoire
     */
    readdir(path: string): Promise<string[]>

    /**
     * Obtient les stats d'un fichier/répertoire
     */
    stat(path: string): Promise<{
        isFile: () => boolean
        isDirectory: () => boolean
        mtime: Date
    }>

    /**
     * Vérifie si un chemin existe
     */
    pathExists(path: string): Promise<boolean>

    /**
     * Lit un fichier JSON
     */
    readJson<T = unknown>(path: string): Promise<T>

    /**
     * Écrit un fichier JSON
     */
    writeJson(
        path: string,
        data: unknown,
        options?: { spaces?: number; EOL?: string }
    ): Promise<void>

    /**
     * Copie un fichier
     */
    copyFile(src: string, dest: string): Promise<void>

    /**
     * Supprime un fichier ou répertoire
     */
    remove(path: string): Promise<void>

    /**
     * Lit un fichier de manière synchrone (pour compatibilité)
     */
    readFileSync(path: string, encoding?: BufferEncoding): string

    /**
     * Écrit un fichier de manière synchrone (pour compatibilité)
     */
    writeFileSync(path: string, content: string): void

    /**
     * Vérifie l'existence d'un fichier/répertoire (synchrone)
     */
    existsSync(path: string): boolean

    /**
     * Crée un répertoire (synchrone)
     */
    mkdirSync(path: string, options?: { recursive?: boolean }): void
}

/**
 * Adaptateur de système de fichiers
 *
 * Implémente IFsAdapter et peut utiliser soit fs-extra (par défaut),
 * soit memfs (pour les tests).
 */
export class FileSystemAdapter implements IFsAdapter {
    /**
     * @param fsImpl - Implémentation du filesystem (memfs) ou undefined pour fs-extra
     */
    constructor(private readonly fsImpl?: IFs) { }

    /**
     * Obtient l'implémentation du filesystem
     */
    private getFs(): IFs | typeof fs {
        return this.fsImpl || fs
    }

    /**
     * Normalise un chemin (résout les chemins relatifs)
     */
    private normalizePath(path: string): string {
        return resolve(path)
    }

    // ===== Async Operations =====

    async readFile(
        path: string,
        encoding: BufferEncoding = 'utf-8'
    ): Promise<string> {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        if (this.fsImpl) {
            // memfs
            const content = await implementation.promises.readFile(fullPath, encoding)
            if (typeof content === 'string') {
                return content
            }
            // Si c'est un Buffer, le convertir en string
            const buffer = content as unknown as Buffer
            return buffer.toString(encoding)
        } else {
            // fs-extra
            const content = await fs.readFile(fullPath, encoding)
            if (typeof content === 'string') {
                return content
            }
            // Si c'est un Buffer, le convertir en string
            const buffer = content as unknown as Buffer
            return buffer.toString(encoding)
        }
    }

    async writeFile(
        path: string,
        content: string,
        encoding: BufferEncoding = 'utf-8'
    ): Promise<void> {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        // Créer le répertoire parent si nécessaire
        const parentDir = dirname(fullPath)
        await this.mkdir(parentDir, { recursive: true })

        if (this.fsImpl) {
            // memfs
            await implementation.promises.writeFile(fullPath, content, encoding)
        } else {
            // fs-extra
            await fs.writeFile(fullPath, content, encoding)
        }
    }

    async mkdir(path: string, _options?: { recursive?: boolean }): Promise<void> {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        if (this.fsImpl) {
            // memfs - toujours utiliser recursive
            await implementation.promises.mkdir(fullPath, { recursive: true })
        } else {
            // fs-extra
            await fs.ensureDir(fullPath)
        }
    }

    async readdir(path: string): Promise<string[]> {
        const fullPath = this.normalizePath(path)

        if (this.fsImpl) {
            // memfs - utiliser readdirSync (synchrone) car plus simple et compatible
            const entries = this.fsImpl.readdirSync(fullPath) as unknown[]
            return Promise.resolve(entries.map((entry) => String(entry)))
        } else {
            // fs-extra
            return (await fs.readdir(fullPath)) as string[]
        }
    }

    async stat(path: string): Promise<{
        isFile: () => boolean
        isDirectory: () => boolean
        mtime: Date
    }> {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        if (this.fsImpl) {
            // memfs
            const stats = await implementation.promises.stat(fullPath)
            return {
                isFile: () => stats.isFile(),
                isDirectory: () => stats.isDirectory(),
                mtime: stats.mtime,
            }
        } else {
            // fs-extra
            const stats = await fs.stat(fullPath)
            return {
                isFile: () => stats.isFile(),
                isDirectory: () => stats.isDirectory(),
                mtime: stats.mtime,
            }
        }
    }

    async pathExists(path: string): Promise<boolean> {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        if (this.fsImpl) {
            // memfs
            try {
                await implementation.promises.access(fullPath)
                return true
            } catch {
                return false
            }
        } else {
            // fs-extra
            return await fs.pathExists(fullPath)
        }
    }

    async readJson<T = unknown>(path: string): Promise<T> {
        const fullPath = this.normalizePath(path)

        if (this.fsImpl) {
            // memfs
            const content = await this.readFile(fullPath)
            return JSON.parse(content) as T
        } else {
            // fs-extra
            return (await fs.readJson(fullPath)) as T
        }
    }

    async writeJson(
        path: string,
        data: unknown,
        options?: { spaces?: number; EOL?: string }
    ): Promise<void> {
        const fullPath = this.normalizePath(path)

        // Créer le répertoire parent si nécessaire
        const parentDir = dirname(fullPath)
        await this.mkdir(parentDir, { recursive: true })

        if (this.fsImpl) {
            // memfs
            const content = JSON.stringify(data, null, options?.spaces ?? 2)
            await this.writeFile(fullPath, content)
        } else {
            // fs-extra
            await fs.writeJson(fullPath, data, {
                spaces: options?.spaces ?? 2,
                EOL: options?.EOL ?? '\n',
            })
        }
    }

    async copyFile(src: string, dest: string): Promise<void> {
        const srcPath = this.normalizePath(src)
        const destPath = this.normalizePath(dest)

        // Créer le répertoire parent de la destination si nécessaire
        const destDir = dirname(destPath)
        await this.mkdir(destDir, { recursive: true })

        if (this.fsImpl) {
            // memfs - copier manuellement
            const content = await this.readFile(srcPath)
            await this.writeFile(destPath, content)
        } else {
            // fs-extra
            await fs.copyFile(srcPath, destPath)
        }
    }

    async remove(path: string): Promise<void> {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        if (this.fsImpl) {
            // memfs
            try {
                const stats = await this.stat(fullPath)
                if (stats.isDirectory()) {
                    // memfs utilise rm avec recursive
                    await implementation.promises.rm(fullPath, { recursive: true })
                } else {
                    await implementation.promises.unlink(fullPath)
                }
            } catch {
                // Ignore si le fichier n'existe pas
            }
        } else {
            // fs-extra
            await fs.remove(fullPath)
        }
    }

    // ===== Sync Operations (pour compatibilité) =====

    readFileSync(path: string, encoding: BufferEncoding = 'utf-8'): string {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        if (this.fsImpl) {
            // memfs
            const content = implementation.readFileSync(fullPath, encoding)
            if (typeof content === 'string') {
                return content
            }
            // Si c'est un Buffer, le convertir en string
            const buffer = content as unknown as Buffer
            return buffer.toString(encoding)
        } else {
            // fs-extra
            const content = fs.readFileSync(fullPath, encoding)
            if (typeof content === 'string') {
                return content
            }
            // Si c'est un Buffer, le convertir en string
            const buffer = content as unknown as Buffer
            return buffer.toString(encoding)
        }
    }

    writeFileSync(path: string, content: string): void {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        // Créer le répertoire parent si nécessaire
        const parentDir = dirname(fullPath)
        if (!this.existsSync(parentDir)) {
            this.mkdirSync(parentDir, { recursive: true })
        }

        if (this.fsImpl) {
            // memfs
            implementation.writeFileSync(fullPath, content)
        } else {
            // fs-extra
            fs.writeFileSync(fullPath, content)
        }
    }

    existsSync(path: string): boolean {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        if (this.fsImpl) {
            // memfs - utiliser statSync pour vérifier l'existence
            try {
                implementation.statSync(fullPath)
                return true
            } catch {
                return false
            }
        } else {
            // fs-extra
            return fs.existsSync(fullPath)
        }
    }

    mkdirSync(path: string, _options?: { recursive?: boolean }): void {
        const fullPath = this.normalizePath(path)
        const implementation = this.getFs()

        if (this.fsImpl) {
            // memfs - toujours utiliser recursive
            implementation.mkdirSync(fullPath, { recursive: true })
        } else {
            // fs-extra
            fs.ensureDirSync(fullPath)
        }
    }
}

/**
 * Crée un adaptateur filesystem par défaut (fs-extra)
 *
 * @returns Adaptateur utilisant fs-extra
 */
export function createDefaultFsAdapter(): IFsAdapter {
    return new FileSystemAdapter()
}
