import { describe, it, expect, beforeEach, vi } from 'vitest'
import inquirer from 'inquirer'
import { promptVueSetup } from '../../../../src/cli/prompts/vue-setup.js'

vi.mock('inquirer')

describe('promptVueSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null if user cancels', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      shouldCreate: false,
    } as never)

    const result = await promptVueSetup('en')

    expect(result).toBeNull()
  })

  it('should return options if user confirms with all options', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      shouldCreate: true,
      projectName: 'my-vue-project',
      typescript: true,
      router: true,
      pinia: true,
      vitest: true,
      eslint: true,
      prettier: true,
    } as never)

    const result = await promptVueSetup('en')

    expect(result).toEqual({
      projectName: 'my-vue-project',
      typescript: true,
      router: true,
      pinia: true,
      vitest: true,
      eslint: true,
      prettier: true,
    })
  })

  it('should trim project name', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      shouldCreate: true,
      projectName: '  my-vue-project  ',
      typescript: false,
      router: false,
      pinia: false,
      vitest: false,
      eslint: false,
      prettier: false,
    } as never)

    const result = await promptVueSetup('en')

    expect(result?.projectName).toBe('my-vue-project')
  })
})
