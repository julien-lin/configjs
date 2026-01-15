# Guide de Contribution - confjs

Merci de votre intérêt pour contribuer à **confjs** ! 🎉

## 🚀 Démarrage rapide

### Prérequis

- Node.js ≥ 20.0.0
- npm, yarn, ou pnpm
- Git

### Setup développement

```bash
# Fork et clone le repo
git clone https://github.com/votre-username/confjs.git
cd confjs

# Installer les dépendances
npm install

# Lancer en mode dev
npm run dev

# Lancer les tests
npm run test:watch
```

## 📋 Comment contribuer

### 1. Issues

Avant de créer une issue, vérifiez qu'elle n'existe pas déjà.

**Types d'issues acceptées :**
- 🐛 Bug reports
- ✨ Feature requests
- 📚 Documentation improvements
- 🔌 Plugin suggestions

**Template d'issue :**

```markdown
### Description
[Description claire et concise]

### Steps to Reproduce (pour bugs)
1. ...
2. ...

### Expected behavior
[Ce qui devrait se passer]

### Actual behavior
[Ce qui se passe réellement]

### Environment
- confjs version:
- Node version:
- OS:
- Package manager:
```

### 2. Pull Requests

**Workflow :**

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/ma-feature`)
3. Commit vos changements (`git commit -m 'feat: ajouter ma feature'`)
4. Push sur la branche (`git push origin feature/ma-feature`)
5. Ouvrir une Pull Request

**Règles :**

- ✅ Suivre les conventions de code (ESLint, Prettier)
- ✅ Ajouter des tests pour les nouvelles features
- ✅ Mettre à jour la documentation si nécessaire
- ✅ Utiliser les [Conventional Commits](#conventional-commits)
- ✅ S'assurer que tous les tests passent
- ✅ Maintenir une coverage ≥ 80%

### 3. Conventional Commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

```
type(scope): description

[body optionnel]

[footer optionnel]
```

**Types :**
- `feat`: Nouvelle feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semi colons, etc
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Tests
- `chore`: Maintenance, dependencies, etc
- `ci`: CI/CD changes

**Exemples :**

```bash
feat(plugins): add react-query plugin
fix(detector): correctly detect pnpm lockfile
docs(readme): update installation instructions
test(validator): add tests for compatibility rules
```

## 🏗️ Architecture

### Structure du projet

```
confjs/
├── src/
│   ├── cli/          # CLI commands et UI
│   │   ├── commands/ # Commandes de framework (ReactCommand, NextjsCommand, etc.)
│   │   ├── prompts/  # Prompts interactifs
│   │   └── utils/    # Utilitaires CLI (installers)
│   ├── core/         # Core logic (detector, validator, installer, framework-registry)
│   ├── plugins/      # Plugin implementations
│   ├── utils/        # Utilities
│   └── types/        # Type definitions
├── tests/
│   ├── unit/         # Tests unitaires
│   ├── integration/  # Tests d'intégration
│   └── e2e/          # Tests end-to-end
└── docs/             # Documentation additionnelle
```

### Architecture des commandes

confjs utilise une architecture modulaire basée sur **BaseFrameworkCommand** et le **Framework Registry**.

**Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour les détails complets.**

#### Ajouter un nouveau framework

1. **Ajouter au type `Framework`** (`src/types/index.ts`)
2. **Ajouter au Framework Registry** (`src/core/framework-registry.ts`)
3. **Créer la commande** (`src/cli/commands/[framework]-command.ts`)
4. **Enregistrer dans CLI** (`src/cli.ts`)
5. **Mettre à jour le détecteur** (`src/core/detector.ts`)

**Exemple complet :** Voir [ARCHITECTURE.md](./ARCHITECTURE.md#-ajouter-un-nouveau-framework)

### Développer un plugin

Voir [PLUGIN_DEVELOPMENT.md](./PLUGIN_DEVELOPMENT.md) pour le guide complet.

**Exemple minimal :**

```typescript
import type { Plugin } from '../types'

export const monPlugin: Plugin = {
  name: 'ma-lib',
  displayName: 'Ma Library',
  description: 'Description',
  category: Category.ROUTING,
  frameworks: ['react'],
  
  async install(ctx) {
    // Installation logic
    return { packages: { dependencies: ['ma-lib'] }, success: true }
  },
  
  async configure(ctx) {
    // Configuration logic
    return { files: [], success: true }
  },
}
```

## 🧪 Tests

### Lancer les tests

```bash
# Tous les tests
npm run test

# Tests unitaires avec coverage
npm run test:unit

# Tests en mode watch
npm run test:watch

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

### Écrire des tests

**Test unitaire :**

```typescript
import { describe, it, expect } from 'vitest'
import { maFonction } from '../src/utils/ma-fonction'

describe('maFonction', () => {
  it('devrait retourner le bon résultat', () => {
    expect(maFonction('input')).toBe('output')
  })
})
```

**Test d'intégration :**

```typescript
import { describe, it, beforeEach, afterEach } from 'vitest'

describe('Installation Flow', () => {
  beforeEach(async () => {
    // Setup test project
  })
  
  afterEach(async () => {
    // Cleanup
  })
  
  it('devrait installer et configurer react-router', async () => {
    // Test implementation
  })
})
```

## 📝 Documentation

### Code documentation

Utiliser JSDoc pour documenter les fonctions publiques :

```typescript
/**
 * Détecte le contexte d'un projet React
 * 
 * @param projectRoot - Chemin racine du projet
 * @returns Le contexte détecté
 * @throws {Error} Si la détection échoue
 * 
 * @example
 * ```typescript
 * const ctx = await detectContext('/path/to/project')
 * console.log(ctx.framework) // 'react'
 * ```
 */
export async function detectContext(
  projectRoot: string
): Promise<ProjectContext> {
  // Implementation
}
```

### README et docs

- Garder le README à jour avec les nouvelles features
- Ajouter des exemples d'utilisation
- Documenter les breaking changes

## 🎨 Style Guide

### TypeScript

```typescript
// ✅ Bon
interface User {
  id: string
  name: string
  email: string
}

export function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Mauvais
export function getUser(id: any): any {
  // ...
}
```

### Imports

```typescript
// ✅ Bon - imports groupés et ordonnés
import type { Plugin, ProjectContext } from '../types'
import { readFile, writeFile } from 'fs/promises'
import { logger } from '../utils/logger'

// ❌ Mauvais - imports mélangés
import { logger } from '../utils/logger'
import type { Plugin } from '../types'
import { readFile } from 'fs/promises'
import type { ProjectContext } from '../types'
```

### Fonctions

```typescript
// ✅ Bon - fonction pure, typée, avec JSDoc
/**
 * Valide une sélection de plugins
 */
export function validatePlugins(
  plugins: Plugin[],
  rules: CompatibilityRule[]
): ValidationResult {
  // Implementation
}

// ❌ Mauvais - side effects, pas de types
export function validatePlugins(plugins, rules) {
  console.log('Validating...')  // Side effect
  // Implementation
}
```

## 🐛 Debugging

### Debug logs

Utiliser le logger fourni :

```typescript
import { logger } from '../utils/logger'

logger.debug('Debug info', { data })
logger.info('Info message')
logger.warn('Warning')
logger.error('Error occurred')
```

### Lancer avec debug

```bash
npx confjs react --debug
```

## 📊 Performance

### Guidelines

- Éviter les opérations bloquantes
- Utiliser `Promise.all()` pour les opérations parallèles
- Cacher les résultats quand possible
- Limiter les appels filesystem

### Exemple

```typescript
// ✅ Bon - parallèle
const [pkg, tsconfig] = await Promise.all([
  readPackageJson(),
  readTsConfig(),
])

// ❌ Mauvais - séquentiel
const pkg = await readPackageJson()
const tsconfig = await readTsConfig()
```

## ⚖️ License

En contribuant, vous acceptez que vos contributions soient sous licence MIT.

## 🙏 Remerciements

Merci à tous les contributeurs ! Votre travail est apprécié. 🎉

## 📞 Contact

Questions ? Ouvrez une issue ou contactez-nous sur :
- GitHub: [confjs/issues](https://github.com/julien/confjs/issues)

---

**Bon coding! 🚀**

