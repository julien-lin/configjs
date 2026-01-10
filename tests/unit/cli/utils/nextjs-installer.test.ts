import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createNextjsProject } from '../../../../src/cli/utils/nextjs-installer.js'
import * as execa from 'execa'
import * as fsHelpers from '../../../../src/utils/fs-helpers.js'

// Mocks
vi.mock('execa')
vi.mock('../../../../src/utils/fs-helpers.js')
vi.mock('../../../../src/utils/logger.js')

describe('nextjs-installer', () => {
  const mockCurrentDir = '/tmp'
  const mockProjectName = 'my-nextjs-app'
  const mockProjectPath = `${mockCurrentDir}/${mockProjectName}`

  const mockOptions = {
    projectName: mockProjectName,
    typescript: true,
    eslint: true,
    tailwind: true,
    srcDir: false,
    appRouter: true,
    importAlias: '@/*',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(false)
    vi.mocked(execa.execa).mockResolvedValue({
      exitCode: 0,
    } as never)
  })

  describe('createNextjsProject', () => {
    it('should create Next.js project with TypeScript and all options', async () => {
      const result = await createNextjsProject(
        mockOptions,
        mockCurrentDir,
        'fr'
      )

      expect(result).toBe(mockProjectPath)
      expect(fsHelpers.checkPathExists).toHaveBeenCalledWith(mockProjectPath)
      expect(execa.execa).toHaveBeenCalledWith(
        'npm',
        [
          'create',
          'next-app@latest',
          mockProjectName,
          '--typescript',
          '--eslint',
          '--tailwind',
          '--no-src-dir',
          '--app',
          '--import-alias',
          '@/*',
        ],
        expect.objectContaining({
          cwd: mockCurrentDir,
          stdio: 'inherit',
        })
      )
    })

    it('should create Next.js project with JavaScript and Pages Router', async () => {
      const options = {
        ...mockOptions,
        typescript: false,
        eslint: false,
        tailwind: false,
        srcDir: true,
        appRouter: false,
      }

      const result = await createNextjsProject(options, mockCurrentDir, 'en')

      expect(result).toBe(mockProjectPath)
      expect(execa.execa).toHaveBeenCalledWith(
        'npm',
        [
          'create',
          'next-app@latest',
          mockProjectName,
          '--javascript',
          '--no-eslint',
          '--no-tailwind',
          '--src-dir',
          '--pages',
          '--import-alias',
          '@/*',
        ],
        expect.any(Object)
      )
    })

    it('should throw error if folder already exists', async () => {
      vi.mocked(fsHelpers.checkPathExists).mockResolvedValue(true)

      await expect(
        createNextjsProject(mockOptions, mockCurrentDir, 'fr')
      ).rejects.toThrow('existe déjà')
    })

    it('should throw error if create-next-app fails', async () => {
      vi.mocked(execa.execa).mockResolvedValue({
        exitCode: 1,
      } as never)

      await expect(
        createNextjsProject(mockOptions, mockCurrentDir, 'en')
      ).rejects.toThrow('exit code 1')
    })

    it('should handle execa errors', async () => {
      vi.mocked(execa.execa).mockRejectedValue(new Error('Network error'))

      await expect(
        createNextjsProject(mockOptions, mockCurrentDir, 'es')
      ).rejects.toThrow('Network error')
    })

    it('should use custom import alias', async () => {
      const options = {
        ...mockOptions,
        importAlias: '~/*',
      }

      await createNextjsProject(options, mockCurrentDir, 'fr')

      expect(execa.execa).toHaveBeenCalledWith(
        'npm',
        expect.arrayContaining(['--import-alias', '~/*']),
        expect.any(Object)
      )
    })
  })
})
