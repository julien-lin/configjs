import pc from 'picocolors'

/**
 * ASCII Art Logo for ConfigJS
 */
const LOGO = `
   ___________                 __ _ ________
  / ____/ ____/__  ____  __  _/ // / / ____/
 / /   / /_  / _ \\/ __ \\/ / / / // / / __/
/ /___/ __  /  __/ / / / /_/ /__  / / /___
\\____/_/ /_/\\___/_/ /_/\\__,_/__/_/ \\____/

`

/**
 * Displays the ConfigJS logo
 */
export function displayLogo(): void {
  console.log(pc.cyan(LOGO))
}

/**
 * Displays the ConfigJS logo with version
 */
export function displayLogoWithVersion(version: string): void {
  displayLogo()
  console.log(pc.gray(`ConfigJS v${version}`))
  console.log()
}
