import { describe, it, expect, beforeEach, vi } from 'vitest'
import { execa } from 'execa'
import { checkPathExists } from '../../../../src/utils/fs-helpers.js'
import { createVueProject } from '../../../../src/cli/utils/vue-installer.js'
import type { VueSetupOptions } from '../../../../src/cli/prompts/vue-setup.js'

vi.mock('execa')
vi.mock('../../../../src/utils/fs-helpers.js')

describe('createVueProject', () => {
  const mockOptions: VueSetupOptions = {
    projectName: 'test-vue-project',
    typescript: true,
    router: true,
    pinia: true,
    vitest: true,
    eslint: true,
    prettier: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkPathExists).mockResolvedValue(false)
    vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '' } as never)
  })

  it('should create Vue project with TypeScript template', async () => {
    await createVueProject(mockOptions, '/tmp', 'en')

    expect(execa).toHaveBeenCalledWith(
      'npm',
      [
        'create',
        'vite@latest',
        'test-vue-project',
        '--',
        '--template',
        'vue-ts',
      ],
      expect.objectContaining({
        cwd: '/tmp',
        stdio: 'inherit',
      })
    )
  })

  it('should create Vue project with JavaScript template', async () => {
    const jsOptions = { ...mockOptions, typescript: false }

    await createVueProject(jsOptions, '/tmp', 'en')

    expect(execa).toHaveBeenCalledWith(
      'npm',
      ['create', 'vite@latest', 'test-vue-project', '--', '--template', 'vue'],
      expect.objectContaining({
        cwd: '/tmp',
        stdio: 'inherit',
      })
    )
  })

  it('should install optional dependencies after project creation', async () => {
    await createVueProject(mockOptions, '/tmp', 'en')

    // Vérifier que les dépendances optionnelles sont installées
    expect(execa).toHaveBeenCalledWith(
      'npm',
      expect.arrayContaining([
        'install',
        'vue-router@4',
        'pinia',
        'vitest',
        '@vue/test-utils',
        '@vitest/ui',
        'eslint',
        'eslint-plugin-vue',
        '@vue/eslint-config-prettier',
        'prettier',
        'eslint-config-prettier',
      ]),
      expect.objectContaining({
        cwd: expect.stringContaining('test-vue-project'),
        stdio: 'inherit',
      })
    )
  })

  it('should throw error if folder already exists', async () => {
    vi.mocked(checkPathExists).mockResolvedValue(true)

    await expect(createVueProject(mockOptions, '/tmp', 'en')).rejects.toThrow(
      'already exists'
    )
  })

  it('should throw error if create-vite fails', async () => {
    vi.mocked(execa).mockRejectedValueOnce(new Error('Command failed'))

    await expect(createVueProject(mockOptions, '/tmp', 'en')).rejects.toThrow(
      'Error creating project'
    )
  })
})
