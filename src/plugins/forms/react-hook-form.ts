import { resolve, join } from 'path'
import type {
  Plugin,
  ProjectContext,
  ConfigResult,
  InstallResult,
} from '../../types/index.js'
import { Category } from '../../types/index.js'
import { installPackages } from '../../utils/package-manager.js'
import { ConfigWriter } from '../../core/config-writer.js'
import { BackupManager } from '../../core/backup-manager.js'
import { ensureDirectory } from '../../utils/fs-helpers.js'
import { logger } from '../../utils/logger.js'

/**
 * Plugin React Hook Form
 *
 * Gestion de formulaires performante pour React
 * Documentation officielle : https://react-hook-form.com
 *
 * @example
 * ```typescript
 * import { reactHookFormPlugin } from './plugins/forms/react-hook-form'
 * await reactHookFormPlugin.install(ctx)
 * await reactHookFormPlugin.configure(ctx)
 * ```
 */
export const reactHookFormPlugin: Plugin = {
  name: 'react-hook-form',
  displayName: 'React Hook Form',
  description: 'Gestion de formulaires performante pour React',
  category: Category.FORMS,
  version: '^7.69.0',

  frameworks: ['react'],

  /**
   * Détecte si React Hook Form est déjà installé
   */
  detect: (ctx: ProjectContext): boolean => {
    return (
      ctx.dependencies['react-hook-form'] !== undefined ||
      ctx.devDependencies['react-hook-form'] !== undefined
    )
  },

  /**
   * Installe React Hook Form
   */
  async install(ctx: ProjectContext): Promise<InstallResult> {
    if (this.detect?.(ctx)) {
      logger.info('React Hook Form is already installed')
      return {
        packages: {},
        success: true,
        message: 'React Hook Form already installed',
      }
    }

    try {
      await installPackages(['react-hook-form'], {
        dev: false,
        packageManager: ctx.packageManager,
        projectRoot: ctx.projectRoot,
        exact: false,
        silent: false,
      })

      logger.info('Successfully installed React Hook Form')

      return {
        packages: {
          dependencies: ['react-hook-form'],
        },
        success: true,
        message: 'Installed react-hook-form',
      }
    } catch (error) {
      logger.error('Failed to install React Hook Form:', error)
      return {
        packages: {},
        success: false,
        message: `Failed to install React Hook Form: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Configure React Hook Form dans le projet
   *
   * Crée :
   * - src/components/forms/ExampleForm.tsx (ou .jsx) : Exemple de formulaire basique
   * - src/components/forms/ValidatedForm.tsx (ou .jsx) : Exemple avec validation
   *
   * Documentation : https://react-hook-form.com/get-started
   */
  async configure(ctx: ProjectContext): Promise<ConfigResult> {
    const backupManager = new BackupManager()
    const writer = new ConfigWriter(backupManager)

    const files: ConfigResult['files'] = []
    const srcDir = resolve(ctx.projectRoot, ctx.srcDir)
    const extension = ctx.typescript ? 'tsx' : 'jsx'

    try {
      // 1. Créer le dossier components/forms si nécessaire
      const formsDir = join(srcDir, 'components', 'forms')
      await ensureDirectory(formsDir)

      // 2. Créer src/components/forms/ExampleForm.tsx (exemple basique)
      const exampleFormPath = join(formsDir, `ExampleForm.${extension}`)
      const exampleFormContent = ctx.typescript
        ? getExampleFormContentTS()
        : getExampleFormContentJS()

      await writer.createFile(exampleFormPath, exampleFormContent)
      files.push({
        type: 'create',
        path: exampleFormPath,
        content: exampleFormContent,
        backup: false,
      })

      logger.info(`Created example form: ${exampleFormPath}`)

      // 3. Créer src/components/forms/ValidatedForm.tsx (exemple avec validation)
      const validatedFormPath = join(formsDir, `ValidatedForm.${extension}`)
      const validatedFormContent = ctx.typescript
        ? getValidatedFormContentTS()
        : getValidatedFormContentJS()

      await writer.createFile(validatedFormPath, validatedFormContent)
      files.push({
        type: 'create',
        path: validatedFormPath,
        content: validatedFormContent,
        backup: false,
      })

      logger.info(`Created validated form: ${validatedFormPath}`)

      // 4. Créer src/components/forms/index.ts (export centralisé)
      const indexPath = join(formsDir, `index.${ctx.typescript ? 'ts' : 'js'}`)
      const indexContent = ctx.typescript
        ? getIndexContentTS()
        : getIndexContentJS()

      await writer.createFile(indexPath, indexContent)
      files.push({
        type: 'create',
        path: indexPath,
        content: indexContent,
        backup: false,
      })

      logger.info(`Created forms index: ${indexPath}`)

      return {
        files,
        success: true,
        message: 'React Hook Form configured successfully',
      }
    } catch (error) {
      logger.error('Failed to configure React Hook Form:', error)
      await backupManager.restoreAll()
      return {
        files,
        success: false,
        message: `Failed to configure React Hook Form: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  },

  /**
   * Rollback de la configuration React Hook Form
   */
  async rollback(_ctx: ProjectContext): Promise<void> {
    const backupManager = new BackupManager()
    try {
      await backupManager.restoreAll()
      logger.info('React Hook Form configuration rolled back')
    } catch (error) {
      logger.error('Failed to rollback React Hook Form configuration:', error)
      throw error
    }
  },
}

/**
 * Contenu du fichier components/forms/ExampleForm.tsx (TypeScript)
 * Exemple de formulaire basique avec React Hook Form
 */
function getExampleFormContentTS(): string {
  return `import { useForm, SubmitHandler } from 'react-hook-form'

/**
 * Exemple de formulaire basique avec React Hook Form
 * 
 * Documentation : https://react-hook-form.com/get-started
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 * 
 * @example
 * \`\`\`tsx
 * import { ExampleForm } from './components/forms/ExampleForm'
 * 
 * function App() {
 *   return <ExampleForm />
 * }
 * \`\`\`
 */
type FormInputs = {
  firstName: string
  lastName: string
  email: string
}

export function ExampleForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormInputs>()

  const onSubmit: SubmitHandler<FormInputs> = (data) => {
    console.log(data)
    // Traiter les données du formulaire ici
  }

  // Surveiller la valeur d'un champ
  const firstName = watch('firstName')

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          {...register('firstName', { required: true })}
          aria-invalid={errors.firstName ? 'true' : 'false'}
        />
        {errors.firstName?.type === 'required' && (
          <p role="alert">First name is required</p>
        )}
      </div>

      <div>
        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" {...register('lastName')} />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>

      <button type="submit">Submit</button>

      {firstName && <p>You typed: {firstName}</p>}
    </form>
  )
}
`
}

/**
 * Contenu du fichier components/forms/ExampleForm.jsx (JavaScript)
 */
function getExampleFormContentJS(): string {
  return `import { useForm } from 'react-hook-form'

/**
 * Exemple de formulaire basique avec React Hook Form
 * 
 * Documentation : https://react-hook-form.com/get-started
 * 
 * Ce composant est créé automatiquement par confjs.
 * Vous pouvez le modifier selon vos besoins.
 */
export function ExampleForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const onSubmit = (data) => {
    console.log(data)
    // Traiter les données du formulaire ici
  }

  // Surveiller la valeur d'un champ
  const firstName = watch('firstName')

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          {...register('firstName', { required: true })}
          aria-invalid={errors.firstName ? 'true' : 'false'}
        />
        {errors.firstName?.type === 'required' && (
          <p role="alert">First name is required</p>
        )}
      </div>

      <div>
        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" {...register('lastName')} />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>

      <button type="submit">Submit</button>

      {firstName && <p>You typed: {firstName}</p>}
    </form>
  )
}
`
}

/**
 * Contenu du fichier components/forms/ValidatedForm.tsx (TypeScript)
 * Exemple de formulaire avec validation avancée
 */
function getValidatedFormContentTS(): string {
  return `import { useForm, SubmitHandler } from 'react-hook-form'

/**
 * Exemple de formulaire avec validation avancée
 * 
 * Documentation : https://react-hook-form.com/get-started
 * 
 * Ce composant démontre les différentes règles de validation :
 * - required
 * - min/max
 * - minLength/maxLength
 * - pattern
 * 
 * @example
 * \`\`\`tsx
 * import { ValidatedForm } from './components/forms/ValidatedForm'
 * 
 * function App() {
 *   return <ValidatedForm />
 * }
 * \`\`\`
 */
type FormInputs = {
  firstName: string
  lastName: string
  age: number
  password: string
}

export function ValidatedForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>()

  const onSubmit: SubmitHandler<FormInputs> = (data) => {
    console.log(data)
    // Traiter les données du formulaire ici
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          {...register('firstName', {
            required: true,
            maxLength: 20,
          })}
          aria-invalid={errors.firstName ? 'true' : 'false'}
        />
        {errors.firstName?.type === 'required' && (
          <p role="alert">First name is required</p>
        )}
        {errors.firstName?.type === 'maxLength' && (
          <p role="alert">First name must be less than 20 characters</p>
        )}
      </div>

      <div>
        <label htmlFor="lastName">Last Name</label>
        <input
          id="lastName"
          {...register('lastName', {
            pattern: /^[A-Za-z]+$/i,
          })}
          aria-invalid={errors.lastName ? 'true' : 'false'}
        />
        {errors.lastName?.type === 'pattern' && (
          <p role="alert">Last name must contain only letters</p>
        )}
      </div>

      <div>
        <label htmlFor="age">Age</label>
        <input
          id="age"
          type="number"
          {...register('age', {
            min: 18,
            max: 99,
            required: true,
          })}
          aria-invalid={errors.age ? 'true' : 'false'}
        />
        {errors.age?.type === 'required' && (
          <p role="alert">Age is required</p>
        )}
        {errors.age?.type === 'min' && (
          <p role="alert">Age must be at least 18</p>
        )}
        {errors.age?.type === 'max' && (
          <p role="alert">Age must be at most 99</p>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          })}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
        {errors.password && <p role="alert">{errors.password.message}</p>}
      </div>

      <button type="submit">Submit</button>
    </form>
  )
}
`
}

/**
 * Contenu du fichier components/forms/ValidatedForm.jsx (JavaScript)
 */
function getValidatedFormContentJS(): string {
  return `import { useForm } from 'react-hook-form'

/**
 * Exemple de formulaire avec validation avancée
 * 
 * Documentation : https://react-hook-form.com/get-started
 * 
 * Ce composant démontre les différentes règles de validation :
 * - required
 * - min/max
 * - minLength/maxLength
 * - pattern
 */
export function ValidatedForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = (data) => {
    console.log(data)
    // Traiter les données du formulaire ici
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          {...register('firstName', {
            required: true,
            maxLength: 20,
          })}
          aria-invalid={errors.firstName ? 'true' : 'false'}
        />
        {errors.firstName?.type === 'required' && (
          <p role="alert">First name is required</p>
        )}
        {errors.firstName?.type === 'maxLength' && (
          <p role="alert">First name must be less than 20 characters</p>
        )}
      </div>

      <div>
        <label htmlFor="lastName">Last Name</label>
        <input
          id="lastName"
          {...register('lastName', {
            pattern: /^[A-Za-z]+$/i,
          })}
          aria-invalid={errors.lastName ? 'true' : 'false'}
        />
        {errors.lastName?.type === 'pattern' && (
          <p role="alert">Last name must contain only letters</p>
        )}
      </div>

      <div>
        <label htmlFor="age">Age</label>
        <input
          id="age"
          type="number"
          {...register('age', {
            min: 18,
            max: 99,
            required: true,
          })}
          aria-invalid={errors.age ? 'true' : 'false'}
        />
        {errors.age?.type === 'required' && (
          <p role="alert">Age is required</p>
        )}
        {errors.age?.type === 'min' && (
          <p role="alert">Age must be at least 18</p>
        )}
        {errors.age?.type === 'max' && (
          <p role="alert">Age must be at most 99</p>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          })}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
        {errors.password && <p role="alert">{errors.password.message}</p>}
      </div>

      <button type="submit">Submit</button>
    </form>
  )
}
`
}

/**
 * Contenu du fichier components/forms/index.ts (TypeScript)
 */
function getIndexContentTS(): string {
  return `export { ExampleForm } from './ExampleForm'
export { ValidatedForm } from './ValidatedForm'
`
}

/**
 * Contenu du fichier components/forms/index.js (JavaScript)
 */
function getIndexContentJS(): string {
  return `export { ExampleForm } from './ExampleForm'
export { ValidatedForm } from './ValidatedForm'
`
}
