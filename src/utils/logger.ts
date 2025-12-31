import pc from 'picocolors'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

class Logger {
  private level: LogLevel = LogLevel.INFO

  setLevel(level: LogLevel): void {
    this.level = level
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(pc.gray(`[DEBUG] ${message}`), ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(pc.blue(`ℹ ${message}`), ...args)
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(pc.green(`✓ ${message}`), ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(pc.yellow(`⚠ ${message}`), ...args)
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(pc.red(`✖ ${message}`), ...args)
    }
  }

  step(message: string): void {
    if (this.level <= LogLevel.INFO) {
      console.log(pc.cyan(`\n→ ${message}`))
    }
  }

  box(title: string, content: string[]): void {
    if (this.level <= LogLevel.INFO) {
      const maxLength = Math.max(
        title.length,
        ...content.map((line) => line.length)
      )
      const border = '─'.repeat(maxLength + 4)

      console.log(pc.cyan(`┌${border}┐`))
      console.log(pc.cyan(`│  ${title.padEnd(maxLength)}  │`))
      console.log(pc.cyan(`├${border}┤`))
      content.forEach((line) => {
        console.log(pc.cyan(`│  ${line.padEnd(maxLength)}  │`))
      })
      console.log(pc.cyan(`└${border}┘`))
    }
  }
}

export const logger = new Logger()
