import { describe, it, expect, beforeEach, vi } from 'vitest'
import { promptNextjsSetup } from '../../../../src/cli/prompts/nextjs-setup.js'
import * as inquirer from 'inquirer'

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

describe('nextjs-setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('promptNextjsSetup', () => {
    it('should return null if user cancels', async () => {
      vi.mocked(inquirer.default.prompt).mockResolvedValue({
        shouldCreate: false,
      } as never)

      const result = await promptNextjsSetup('fr')

      expect(result).toBeNull()
      expect(inquirer.default.prompt).toHaveBeenCalledTimes(1)
    })

    it('should return options when user confirms', async () => {
      vi.mocked(inquirer.default.prompt).mockResolvedValue({
        shouldCreate: true,
        projectName: 'my-nextjs-app',
        typescript: true,
        eslint: true,
        tailwind: true,
        srcDir: false,
        appRouter: true,
        importAlias: '@/*',
      } as never)

      const result = await promptNextjsSetup('fr')

      expect(result).not.toBeNull()
      expect(result?.projectName).toBe('my-nextjs-app')
      expect(result?.typescript).toBe(true)
      expect(result?.eslint).toBe(true)
      expect(result?.tailwind).toBe(true)
      expect(result?.srcDir).toBe(false)
      expect(result?.appRouter).toBe(true)
      expect(result?.importAlias).toBe('@/*')
    })

    it('should trim project name', async () => {
      vi.mocked(inquirer.default.prompt).mockResolvedValue({
        shouldCreate: true,
        projectName: '  my-nextjs-app  ',
        typescript: false,
        eslint: true,
        tailwind: false,
        srcDir: true,
        appRouter: false,
        importAlias: '@/*',
      } as never)

      const result = await promptNextjsSetup('en')

      expect(result?.projectName).toBe('my-nextjs-app')
    })

    it('should trim import alias', async () => {
      vi.mocked(inquirer.default.prompt).mockResolvedValue({
        shouldCreate: true,
        projectName: 'my-app',
        typescript: true,
        eslint: true,
        tailwind: true,
        srcDir: false,
        appRouter: true,
        importAlias: '  @/*  ',
      } as never)

      const result = await promptNextjsSetup('es')

      expect(result?.importAlias).toBe('@/*')
    })
  })
})
