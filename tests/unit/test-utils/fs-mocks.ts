import * as fsHelpers from '../../../src/utils/fs-helpers.js'

export const fsMocks = {
  checkPathExists: fsHelpers.checkPathExists as unknown as {
    mockImplementation: (fn: (...args: unknown[]) => unknown) => void
    mockResolvedValue: (v: boolean) => void
    mockResolvedValueOnce: (v: boolean) => void
    mockRejectedValue: (e: unknown) => void
  },
  readPackageJson: fsHelpers.readPackageJson as unknown as {
    mockResolvedValue: (v: unknown) => void
    mockRejectedValue: (e: unknown) => void
    mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  },
  readTsConfig: fsHelpers.readTsConfig as unknown as {
    mockResolvedValue: (v: unknown) => void
    mockRejectedValue: (e: unknown) => void
    mockImplementation: (fn: (...args: unknown[]) => unknown) => void
  },
  readFileContent: fsHelpers.readFileContent as unknown as {
    mockImplementation: (fn: (...args: unknown[]) => unknown) => void
    mockResolvedValue: (v: string) => void
    mockResolvedValueOnce: (v: string) => void
    mockRejectedValue: (e: unknown) => void
  },
  writeFileContent: fsHelpers.writeFileContent as unknown as {
    mockImplementation: (fn: (...args: unknown[]) => unknown) => void
    mockResolvedValue: (v: void) => void
    mockRejectedValue: (e: unknown) => void
    mockResolvedValueOnce: (v: unknown) => void
    mockRejectedValueOnce: (e: unknown) => void
  },
  readJson: fsHelpers.readPackageJson as unknown as {
    mockImplementation: (fn: (...args: unknown[]) => unknown) => void
    mockResolvedValue: (v: unknown) => void
    mockRejectedValue: (e: unknown) => void
  },
}
