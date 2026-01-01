import ora, { type Ora } from 'ora'

/**
 * Gestionnaire de spinners pour l'interface CLI
 *
 * Utilise `ora` pour afficher des spinners animés pendant les opérations
 * longues (détection, installation, configuration).
 */
export class SpinnerManager {
  private spinner: Ora | null = null

  constructor() {
    // Constructor vide pour l'instant
    // Peut être étendu pour supporter i18n si nécessaire
  }

  /**
   * Démarre un spinner avec un message
   *
   * @param message - Message à afficher (peut être une clé de traduction)
   * @param text - Texte personnalisé (optionnel, remplace le message traduit)
   */
  start(message: string, text?: string): void {
    this.stop() // Arrêter le spinner précédent s'il existe

    const displayText = text || message

    this.spinner = ora({
      text: displayText,
      spinner: 'dots',
    }).start()
  }

  /**
   * Met à jour le message du spinner
   *
   * @param message - Nouveau message
   */
  update(message: string): void {
    if (this.spinner) {
      this.spinner.text = message
    }
  }

  /**
   * Arrête le spinner avec succès
   *
   * @param message - Message de succès (optionnel)
   */
  succeed(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message)
      this.spinner = null
    }
  }

  /**
   * Arrête le spinner avec une erreur
   *
   * @param message - Message d'erreur (optionnel)
   */
  fail(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message)
      this.spinner = null
    }
  }

  /**
   * Arrête le spinner avec un avertissement
   *
   * @param message - Message d'avertissement (optionnel)
   */
  warn(message?: string): void {
    if (this.spinner) {
      this.spinner.warn(message)
      this.spinner = null
    }
  }

  /**
   * Arrête le spinner avec un message d'information
   *
   * @param message - Message d'information (optionnel)
   */
  info(message?: string): void {
    if (this.spinner) {
      this.spinner.info(message)
      this.spinner = null
    }
  }

  /**
   * Arrête le spinner sans message
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop()
      this.spinner = null
    }
  }

  /**
   * Vérifie si un spinner est actif
   */
  isSpinning(): boolean {
    return this.spinner !== null && this.spinner.isSpinning
  }
}

/**
 * Crée un spinner temporaire pour une opération
 *
 * @param message - Message initial
 * @param operation - Opération à exécuter
 * @returns Résultat de l'opération
 *
 * @example
 * ```typescript
 * const result = await withSpinner('Installing packages...', async () => {
 *   return await installPackages(['react', 'react-dom'])
 * })
 * ```
 */
export async function withSpinner<T>(
  message: string,
  operation: () => Promise<T>
): Promise<T> {
  const spinner = new SpinnerManager()
  spinner.start(message)

  try {
    const result = await operation()
    spinner.succeed()
    return result
  } catch (error) {
    spinner.fail(error instanceof Error ? error.message : String(error))
    throw error
  }
}
