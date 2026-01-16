/* eslint-disable */
import pc from 'picocolors'

/**
 * ASCII Art Logo for ConfigJS
 */
function LOGO(): string {
  return [
    '   ██████╗  ██████╗ ███╗   ██╗███████╗██╗ ██████╗      ██╗███████╗',
    '  ██╔════╝ ██╔═══██╗████╗  ██║██╔════╝██║██╔════╝      ██║██╔════╝',
    '  ██║      ██║   ██║██╔██╗ ██║█████╗  ██║██║  ███╗     ██║███████╗',
    '  ██║      ██║   ██║██║╚██╗██║██╔══╝  ██║██║   ██║██   ██║╚════██║',
    '  ╚██████╗ ╚██████╔╝██║ ╚████║██║     ██║╚██████╔╝╚█████╔╝███████║',
    '   ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝  ╚════╝ ╚══════╝',
  ]
    .map((line) => pc.cyan(line))
    .join('\n')
}
/**
 * Displays the ConfigJS logo
 */
export function displayLogo(): void {
  console.log(LOGO())
}

/**
 * Displays the ConfigJS logo with version
 */
export function displayLogoWithVersion(version: string): void {
  displayLogo()
  console.log(pc.gray(`ConfigJS v${version}`))
  console.log()
}
