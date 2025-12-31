# confjs

<div align="center">

**Configure your frontend stack, instantly**

[![npm version](https://img.shields.io/npm/v/confjs.svg)](https://www.npmjs.com/package/confjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node version](https://img.shields.io/node/v/confjs.svg)](https://nodejs.org)

Un utilitaire CLI intelligent pour installer et configurer automatiquement vos bibliothèques frontend par catégories fonctionnelles.

[Installation](#-installation) • [Usage](#-usage) • [Fonctionnalités](#-fonctionnalités) • [Documentation](#-documentation)

</div>

---

## 🎯 Pourquoi confjs ?

Le bootstrap d'un projet frontend moderne prend **2-4 heures** entre l'installation des bibliothèques, leur configuration, et la résolution des conflits potentiels.

**confjs** réduit ce temps à **moins de 2 minutes** en :

- ✅ **Détectant automatiquement** votre environnement (React, TypeScript, Vite, etc.)
- ✅ **Installant ET configurant** les bibliothèques de votre choix
- ✅ **Validant les compatibilités** pour éviter les conflits
- ✅ **Générant le code initial** nécessaire (routes, stores, configs)
- ✅ Garantissant un **projet immédiatement utilisable**

## 🚀 Installation

Aucune installation nécessaire ! Utilisez directement via `npx` :

```bash
npx confjs react
```

Ou installez globalement :

```bash
npm install -g confjs
confjs react
```

## 📦 Usage

### Mode interactif (recommandé)

```bash
cd mon-projet-react
npx confjs react
```

L'assistant vous guidera à travers les différentes catégories :

```
🔍 Détection du contexte...
   ✓ Framework: React 18.2.0
   ✓ TypeScript: Oui
   ✓ Bundler: Vite 5.0.0

📦 Sélectionnez vos bibliothèques :

? Routing (recommandé)
  ● react-router-dom
  ○ @tanstack/router
  ○ Aucun

? State Management
  ○ Redux Toolkit
  ● zustand
  ○ jotai
  ○ Aucun

...
```

### Mode configuration (CI/CD)

Créez un fichier `.confjs.json` :

```json
{
  "routing": "react-router-dom",
  "state": "zustand",
  "css": "tailwindcss",
  "http": "axios",
  "tooling": ["eslint", "prettier"]
}
```

Puis exécutez :

```bash
npx confjs react --config .confjs.json
```

### Mode dry-run (simulation)

Visualisez ce qui sera installé sans rien modifier :

```bash
npx confjs react --dry-run
```

## ✨ Fonctionnalités

### 🎯 Catégories supportées

| Catégorie | Bibliothèques disponibles |
|-----------|---------------------------|
| **Routing** | react-router-dom, @tanstack/router |
| **State Management** | Redux Toolkit, Zustand, Jotai |
| **HTTP Client** | Axios, Fetch wrapper |
| **CSS/UI** | TailwindCSS, Bootstrap |
| **Tooling** | ESLint, Prettier, Husky, lint-staged, commitlint |

### 🧠 Détection intelligente

confjs détecte automatiquement :

- ✅ Framework et version (React)
- ✅ TypeScript
- ✅ Bundler (Vite, Create React App, Webpack)
- ✅ Package manager (npm, yarn, pnpm, bun)
- ✅ Structure du projet
- ✅ Bibliothèques déjà installées

### ⚙️ Configuration automatique

Contrairement aux simples installers, **confjs configure réellement** vos bibliothèques :

**Exemple avec React Router :**
```
✓ Installation de react-router-dom
✓ Création de src/router.tsx
✓ Création de src/routes/Home.tsx
✓ Intégration dans src/App.tsx
✓ Configuration complète et fonctionnelle
```

**Exemple avec TailwindCSS :**
```
✓ Installation de tailwindcss, postcss, autoprefixer
✓ Création de tailwind.config.js
✓ Création de postcss.config.js
✓ Injection dans src/index.css
✓ Configuration JIT activée
```

### 🛡️ Validation des compatibilités

confjs vérifie automatiquement :

- ❌ **Conflits exclusifs** : Redux + Zustand (un seul state manager)
- ⚠️ **Avertissements** : TailwindCSS + Bootstrap (approches différentes)
- ✅ **Dépendances croisées** : TailwindCSS → PostCSS (installé automatiquement)

### 🔄 Rollback automatique

En cas d'erreur durant l'installation :

```
❌ Erreur détectée
↺ Rollback en cours...
✓ Fichiers restaurés
✓ package.json restauré
```

## 🎨 Options CLI

```bash
npx confjs react [options]
```

| Option | Description |
|--------|-------------|
| `--yes`, `-y` | Accepte tous les choix par défaut |
| `--dry-run`, `-d` | Simule sans écrire sur le disque |
| `--silent`, `-s` | Mode non-interactif (CI/CD) |
| `--debug` | Active les logs détaillés |
| `--config <file>`, `-c` | Utilise un fichier de configuration |
| `--force`, `-f` | Force l'installation (écrase les configs) |

### Exemples

```bash
# Mode rapide avec valeurs par défaut
npx confjs react --yes

# Simulation uniquement
npx confjs react --dry-run

# Pour CI/CD
npx confjs react --silent --config .confjs.json

# Avec logs détaillés
npx confjs react --debug
```

## 📚 Commandes additionnelles

### Liste des bibliothèques disponibles

```bash
npx confjs list
```

Filtrer par catégorie :

```bash
npx confjs list --category routing
npx confjs list --category state
```

### Vérifier la compatibilité

```bash
npx confjs check --config .confjs.json
```

### Aide

```bash
npx confjs --help
npx confjs react --help
```

## 🎯 Exemples d'utilisation

### Setup complet d'un projet React

```bash
# Créer un nouveau projet
npm create vite@latest mon-app -- --template react-ts
cd mon-app

# Installer et configurer la stack
npx confjs react

# Sélectionner :
# - Routing: react-router-dom
# - State: zustand
# - CSS: tailwindcss
# - HTTP: axios
# - Tooling: eslint, prettier

# Démarrer
npm run dev
```

### Configuration pré-définie pour l'équipe

```bash
# .confjs.json (à versionner dans Git)
{
  "routing": "react-router-dom",
  "state": "zustand",
  "css": "tailwindcss",
  "http": "axios",
  "tooling": ["eslint", "prettier", "husky"]
}

# Chaque membre de l'équipe exécute :
npx confjs react --config .confjs.json
```

### Pipeline CI/CD

```yaml
# .github/workflows/setup.yml
- name: Setup project
  run: npx confjs react --silent --config .confjs.json
```

## 🏗️ Architecture

### Système de plugins

confjs utilise une architecture modulaire où chaque bibliothèque est un plugin autonome :

```typescript
interface Plugin {
  name: string
  category: Category
  frameworks: Framework[]
  
  // Compatibilité
  compatibleWith?: string[]
  incompatibleWith?: string[]
  
  // Lifecycle
  install: (ctx: ProjectContext) => Promise<void>
  configure: (ctx: ProjectContext) => Promise<void>
  rollback?: (ctx: ProjectContext) => Promise<void>
}
```

### Extensibilité

Créez vos propres plugins :

```bash
npm install confjs-plugin-react-query
```

confjs détectera et chargera automatiquement les plugins préfixés par `confjs-plugin-*`.

## 🔧 Configuration

### Fichier .confjs.json

```json
{
  "routing": "react-router-dom",
  "state": "zustand",
  "css": "tailwindcss",
  "http": "axios",
  "forms": "react-hook-form",
  "tooling": ["eslint", "prettier", "husky"],
  
  "options": {
    "typescript": true,
    "strict": true,
    "examples": true
  }
}
```

### Fichier .confjs.yaml (alternatif)

```yaml
routing: react-router-dom
state: zustand
css: tailwindcss
http: axios

tooling:
  - eslint
  - prettier
  - husky

options:
  typescript: true
  strict: true
  examples: true
```

## 🤝 Contribuer

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](./docs/CONTRIBUTING.md) pour les guidelines.

### Développer un plugin

Consultez [PLUGIN_DEVELOPMENT.md](./docs/PLUGIN_DEVELOPMENT.md) pour créer vos propres plugins.

### Setup développement

```bash
# Clone
git clone https://github.com/julien/confjs.git
cd confjs

# Install
npm install

# Dev mode
npm run dev

# Tests
npm run test
npm run test:watch

# Build
npm run build
```

## 📋 Requirements

- **Node.js** ≥ 18.0.0
- **npm** / **yarn** / **pnpm** / **bun**
- Un projet React existant

## 🗺️ Roadmap

### v1.0 (MVP) ✅
- [x] Support React
- [x] 12 plugins intégrés
- [x] Validation compatibilités
- [x] Configuration automatique

### v1.1 (Q1 2026)
- [ ] Support Next.js
- [ ] Support Remix
- [ ] Plugins UI (MUI, Chakra, Radix)
- [ ] Plugins forms (React Hook Form, Formik)

### v2.0 (Q2 2026)
- [ ] Support Vue 3
- [ ] Support Svelte
- [ ] Interface web de configuration

### v2.x (Future)
- [ ] Templates personnalisables
- [ ] Marketplace de plugins
- [ ] React Native support

## 📄 License

[MIT](./LICENSE) © Julien

## 🙏 Remerciements

Inspiré par les meilleures pratiques de :
- [Vite](https://vitejs.dev)
- [Create T3 App](https://create.t3.gg)
- [Projen](https://projen.io)

---

<div align="center">

**Fait avec ❤️ pour la communauté frontend**

[Changelog](./CHANGELOG.md) • [Issues](https://github.com/julien/confjs/issues) • [Contributing](./docs/CONTRIBUTING.md)

</div>

