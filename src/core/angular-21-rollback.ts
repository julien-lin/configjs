import { promises as fs } from 'fs'
import { dirname } from 'path'
import { getModuleLogger } from '../utils/logger-provider.js'

const logger = getModuleLogger()

export interface FileOperation {
    type: 'create' | 'update' | 'delete'
    path: string
    originalContent?: string
    newContent?: string
}

export interface RollbackTransaction {
    id: string
    operations: FileOperation[]
    timestamp: number
    status: 'pending' | 'completed' | 'failed'
}

/**
 * Manages file operations with automatic rollback on failure
 */
export class AngularRollbackManager {
    private transactions = new Map<string, RollbackTransaction>()

    /**
     * Starts a new rollback transaction
     */
    createTransaction(id: string): RollbackTransaction {
        const transaction: RollbackTransaction = {
            id,
            operations: [],
            timestamp: Date.now(),
            status: 'pending',
        }
        this.transactions.set(id, transaction)
        return transaction
    }

    /**
     * Tracks a file creation
     */
    trackCreate(transactionId: string, path: string, content: string): void {
        const transaction = this.transactions.get(transactionId)
        if (!transaction) throw new Error(`Transaction ${transactionId} not found`)

        transaction.operations.push({
            type: 'create',
            path,
            newContent: content,
        })
    }

    /**
     * Tracks a file update
     */
    async trackUpdate(
        transactionId: string,
        path: string,
        newContent: string
    ): Promise<void> {
        const transaction = this.transactions.get(transactionId)
        if (!transaction) throw new Error(`Transaction ${transactionId} not found`)

        try {
            const originalContent = await fs.readFile(path, 'utf-8')
            transaction.operations.push({
                type: 'update',
                path,
                originalContent,
                newContent,
            })
        } catch (error) {
            transaction.operations.push({
                type: 'create',
                path,
                newContent,
            })
        }
    }

    /**
     * Tracks a file deletion
     */
    async trackDelete(transactionId: string, path: string): Promise<void> {
        const transaction = this.transactions.get(transactionId)
        if (!transaction) throw new Error(`Transaction ${transactionId} not found`)

        try {
            const originalContent = await fs.readFile(path, 'utf-8')
            transaction.operations.push({
                type: 'delete',
                path,
                originalContent,
            })
        } catch (error) {
            logger.warn(`File not found for deletion: ${path}`)
        }
    }

    /**
     * Commits all operations in a transaction
     */
    async commit(transactionId: string): Promise<void> {
        const transaction = this.transactions.get(transactionId)
        if (!transaction) throw new Error(`Transaction ${transactionId} not found`)

        try {
            for (const op of transaction.operations) {
                switch (op.type) {
                    case 'create':
                        await this.ensureDir(dirname(op.path))
                        await fs.writeFile(op.path, op.newContent!, 'utf-8')
                        break
                    case 'update':
                        await this.ensureDir(dirname(op.path))
                        await fs.writeFile(op.path, op.newContent!, 'utf-8')
                        break
                    case 'delete':
                        await fs.unlink(op.path)
                        break
                }
            }
            transaction.status = 'completed'
        } catch (error) {
            transaction.status = 'failed'
            await this.rollback(transactionId)
            throw error
        }
    }

    /**
     * Rolls back all operations in a transaction
     */
    async rollback(transactionId: string): Promise<void> {
        const transaction = this.transactions.get(transactionId)
        if (!transaction) throw new Error(`Transaction ${transactionId} not found`)

        const operations = [...transaction.operations].reverse()

        for (const op of operations) {
            try {
                switch (op.type) {
                    case 'create':
                        await fs.unlink(op.path)
                        break
                    case 'update':
                        if (op.originalContent) {
                            await fs.writeFile(op.path, op.originalContent, 'utf-8')
                        }
                        break
                    case 'delete':
                        if (op.originalContent) {
                            await this.ensureDir(dirname(op.path))
                            await fs.writeFile(op.path, op.originalContent, 'utf-8')
                        }
                        break
                }
            } catch (error) {
                logger.error(`Failed to rollback ${op.type} on ${op.path}`, error)
            }
        }

        transaction.status = 'failed'
        this.transactions.delete(transactionId)
    }

    /**
     * Ensures directory exists
     */
    private async ensureDir(dir: string): Promise<void> {
        try {
            await fs.mkdir(dir, { recursive: true })
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw error
            }
        }
    }

    /**
     * Clears completed transactions
     */
    cleanup(): void {
        for (const [id, transaction] of this.transactions.entries()) {
            if (transaction.status === 'completed') {
                this.transactions.delete(id)
            }
        }
    }
}

/**
 * Wraps async functions with automatic rollback on error
 */
export function withRollback<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    rollbackManager: AngularRollbackManager
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    return async (...args: Parameters<T>) => {
        const transactionId = `tx-${Date.now()}-${Math.random()}`
        rollbackManager.createTransaction(transactionId)

        try {
            const result = await fn(...args)
            await rollbackManager.commit(transactionId)
            return result
        } catch (error) {
            logger.error(`Error in transaction ${transactionId}, rolling back`, error)
            await rollbackManager.rollback(transactionId)
            throw error
        }
    }
}

export const rollbackManager = new AngularRollbackManager()
