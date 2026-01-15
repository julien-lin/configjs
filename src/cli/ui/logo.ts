import pc from 'picocolors'

/**
 * ASCII Art Logo for ConfigJS
 */
const LOGO = `
  ${pc.cyan('██████╗')}  ${pc.cyan('██████╗')}  ${pc.cyan('███╗   ██╗███████╗██╗ ██████╗ ██╗███████╗')}
  ${pc.cyan('██╔════╝')} ${pc.cyan('██╔═══██╗')} ${pc.cyan('████╗  ██║██╔════╝██║██╔════╝ ██║██╔════╝')}
  ${pc.cyan('██║')}      ${pc.cyan('██║   ██║')} ${pc.cyan('██╔██╗ ██║█████╗  ██║██║  ███╗██║███████╗')}
  ${pc.cyan('██║')}      ${pc.cyan('██║   ██║')} ${pc.cyan('██║╚██╗██║██╔══╝  ██║██║   ██║██║╚════██║')}
  ${pc.cyan('╚██████╗')} ${pc.cyan('╚██████╔╝')} ${pc.cyan('██║ ╚████║██║     ██║╚██████╔╝██║███████║')}
   ${pc.cyan('╚═════╝')}  ${pc.cyan('╚═════╝')}  ${pc.cyan('╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝ ╚═╝╚══════╝')}

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
