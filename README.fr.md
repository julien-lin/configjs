# ConfigJS

**Le CLI intelligent qui configure votre stack frontend complète en moins de 2 minutes**

[![npm version](https://img.shields.io/npm/v/@configjs/cli?style=flat-square&color=blue)](https://www.npmjs.com/package/@configjs/cli)
[![npm downloads](https://img.shields.io/npm/dm/@configjs/cli?style=flat-square&color=brightgreen)](https://www.npmjs.com/package/@configjs/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node version](https://img.shields.io/node/v/@configjs/cli?style=flat-square)](https://nodejs.org)
[![Bundle size](https://img.shields.io/bundlephobia/min/@configjs/cli?style=flat-square)](https://bundlephobia.com/package/@configjs/cli)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤-red?style=for-the-badge&logo=github)](https://github.com/sponsors/julien-lin)

**[Démarrage Rapide](#-démarrage-rapide) • [Fonctionnalités](#-fonctionnalités-clés) • [Documentation](#-documentation) • [Plugins](#-bibliothèques-supportées-40-plugins) • [Contribuer](#-contribuer)**

> **[🇬🇧 English version](./README.md)**

---

## 💡 Pourquoi ConfigJS ?

Configurer un projet React moderne prend généralement **2 à 4 heures** :
- Installer les bibliothèques une par une
- Lire la documentation de chaque outil
- Écrire la configuration boilerplate
- Résoudre les conflits de versions
- Créer la structure de code initiale

**ConfigJS réduit cela à moins de 2 minutes** sans effort.

### Le Problème
```bash
npm install react-router-dom axios zustand tailwindcss ...
# Puis passer des heures à configurer chaque bibliothèque manuellement
# Se battre avec les erreurs TypeScript
# Débugger les conflits de versions
# Écrire du boilerplate répétitif
```

### La Solution ConfigJS
```bash
npx @configjs/cli react
# Assistant interactif vous guide
# Tout installé ET configuré
# Zéro conflit garanti
# Code prêt pour la production généré
```

## 🚀 Démarrage Rapide

**Aucune installation requise !** Utilisez directement avec `npx` :

```bash
cd votre-projet-react
npx @configjs/cli react
```

C'est tout ! ConfigJS va :
1. 🔍 **Détecter** votre environnement (version React, TypeScript, bundler)
2. 🎯 **Vous guider** dans la sélection des bibliothèques par catégorie
3. 📦 **Installer** tous les packages séquentiellement (aucun conflit)
4. ⚙️ **Configurer** tout avec du code fonctionnel
5. ✅ **Valider** la compatibilité et les dépendances
6. 🎉 **Terminé !** Votre projet est prêt pour la production

### Exemple de Session

```bash
$ npx @configjs/cli react

✔ Choisissez votre langue › Français

🔍 Détection du contexte...
   ✓ Framework: React 19.2.0
   ✓ TypeScript: Oui
   ✓ Bundler: Vite 7.2.4
   ✓ Gestionnaire de paquets: npm

✔ CSS / Styling › TailwindCSS
✔ Routing › React Router
✔ Gestion d'état › Zustand
✔ Client HTTP › Axios
✔ Composants UI › Shadcn/ui
✔ Formulaires › React Hook Form + Zod
✔ Outillage › ESLint, Prettier, Husky

✓ 7 bibliothèques sélectionnées

✨ Installation terminée en 1.8s

📦 Packages installés:
   ✓ TailwindCSS (^4.1.18)
   ✓ React Router (^7.11.0)
   ✓ Zustand (^5.0.9)
   ✓ Axios (^1.13.2)
   ...

📝 Fichiers créés:
   • src/router.tsx
   • src/store/index.ts
   • src/lib/api.ts
   • components.json
   ...

🚀 Prochaines étapes:
   1. npm run dev
   2. Visitez http://localhost:5173
```

---

## ✨ Fonctionnalités Clés

### 🎯 Détection Intelligente

ConfigJS détecte automatiquement la configuration de votre projet :
- ✅ **Framework & Version** (React 18/19)
- ✅ **Langage** (JavaScript/TypeScript)
- ✅ **Bundler** (Vite, Webpack, Create React App)
- ✅ **Gestionnaire de Paquets** (npm, yarn, pnpm, bun)
- ✅ **Bibliothèques Déjà Installées** (ignore les doublons)
- ✅ **Structure du Projet** (adapte la configuration)

### ⚙️ Configuration Complète (Pas Seulement l'Installation !)

Contrairement aux simples installateurs, ConfigJS **configure réellement** vos bibliothèques avec du code fonctionnel :

**Exemple React Router :**
```typescript
✓ Installation de react-router-dom
✓ Création de src/router.tsx avec les routes
✓ Création de src/routes/Home.tsx
✓ Création de src/routes/About.tsx
✓ Intégration de RouterProvider dans App.tsx
✓ Types TypeScript configurés
→ Prêt à utiliser immédiatement !
```

**Exemple TailwindCSS :**
```typescript
✓ Installation de tailwindcss + @tailwindcss/vite
✓ Mise à jour de vite.config.ts avec le plugin
✓ Injection des directives dans src/index.css
✓ Mode JIT activé
→ Commencez à utiliser les classes Tailwind maintenant !
```

**Exemple Redux Toolkit :**
```typescript
✓ Installation de @reduxjs/toolkit + react-redux
✓ Création de src/store/index.ts avec configureStore
✓ Création de src/store/slices/counterSlice.ts
✓ Création de src/store/hooks.ts (hooks typés)
✓ Enveloppe App dans <Provider>
→ Configuration Redux complète en quelques secondes !
```

### 🛡️ Validation Intelligente de Compatibilité

ConfigJS prévient les conflits avant qu'ils ne se produisent :

- ❌ **Conflits Exclusifs** : Impossible d'installer Redux + Zustand (un seul gestionnaire d'état)
- ❌ **Routing Exclusif** : React Router OU TanStack Router (pas les deux)
- ⚠️ **Avertissements** : TailwindCSS + Bootstrap (philosophies différentes)
- ✅ **Dépendances Automatiques** : TailwindCSS nécessite PostCSS → installé automatiquement
- ✅ **Suivi des Plugins** : Mémorise les plugins installés (`.configjsrc`)

### 📦 Bibliothèques Supportées (40+ Plugins)

#### 🎨 CSS / Styling
- TailwindCSS v4 (avec @tailwindcss/vite)
- Styled Components
- React Bootstrap
- Emotion
- CSS Modules

#### 🧭 Routing
- React Router v7
- TanStack Router

#### 🗂️ Gestion d'État
- Redux Toolkit
- Zustand
- Jotai
- MobX

#### 🌐 Client HTTP
- Axios
- TanStack Query (React Query)
- Fetch Wrapper

#### 📝 Formulaires
- React Hook Form
- Formik
- Zod (validation)
- Yup (validation)

#### 🎨 Composants UI
- Shadcn/ui
- Radix UI
- React Icons
- Lucide Icons
- React Hot Toast

#### 🧪 Tests
- React Testing Library
- Vitest
- Jest

#### 🛠️ Outillage
- ESLint
- Prettier
- Husky (Git hooks)
- lint-staged
- date-fns

#### ✨ Animation
- Framer Motion
- React Spring

#### 🔧 Utilitaires
- Lodash
- clsx / classnames

### 🔄 Rollback Automatique

Si quelque chose se passe mal, ConfigJS restaure automatiquement tout :

```bash
❌ Erreur détectée durant la configuration
↺ Rollback en cours...
   ✓ package.json restauré
   ✓ Tous les fichiers modifiés restaurés
   ✓ Fichiers créés supprimés
✅ Projet restauré à l'état précédent
```

### 🎯 Système de Suivi des Plugins

Ne réinstallez jamais la même bibliothèque deux fois :

```bash
# Première exécution
$ npx @configjs/cli react
✔ TailwindCSS › Sélectionné

# Deuxième exécution (même projet)
$ npx @configjs/cli react
ℹ TailwindCSS est déjà installé, ignoré...

# Vérifier les plugins installés
$ npx @configjs/cli installed
📦 Plugins installés:
   ✓ TailwindCSS (^4.1.18) - installé il y a 2 heures
   ✓ React Router (^7.11.0) - installé il y a 2 heures
```

ConfigJS crée un fichier `.configjsrc` pour suivre les installations et prévenir les conflits.

---

## 📖 Documentation

### Commandes

```bash
# Installation interactive
npx @configjs/cli react

# Lister les plugins disponibles
npx @configjs/cli list
npx @configjs/cli list --category routing

# Vérifier les plugins installés
npx @configjs/cli installed

# Retirer un plugin du suivi
npx @configjs/cli remove <nom-du-plugin>

# Valider la compatibilité du projet
npx @configjs/cli check
```

### Options CLI

```bash
npx @configjs/cli react [options]
```

| Option | Description |
|--------|-------------|
| `--yes`, `-y` | Ignorer les prompts, utiliser les valeurs par défaut |
| `--dry-run`, `-d` | Simuler sans écrire de fichiers |
| `--silent`, `-s` | Aucune sortie (mode CI/CD) |
| `--no-install` | Générer seulement les configs, ignorer npm install |
| `--debug` | Logs verbeux |

### Exemples d'Utilisation

**Configuration rapide avec les valeurs par défaut :**
```bash
npx @configjs/cli react --yes
```

**Mode CI/CD :**
```bash
npx @configjs/cli react --silent --yes
```

**Prévisualiser les changements uniquement :**
```bash
npx @configjs/cli react --dry-run
```

**Générer les configs sans installer les packages :**
```bash
npx @configjs/cli react --no-install
```

---

## 🏗️ Architecture

ConfigJS utilise une architecture modulaire de plugins où chaque bibliothèque est un plugin autonome :

```typescript
interface Plugin {
  name: string
  category: Category
  frameworks: Framework[]
  
  // Compatibilité
  compatibleWith?: string[]
  incompatibleWith?: string[]
  requires?: string[]
  
  // Cycle de vie
  detect?: (ctx: ProjectContext) => boolean | Promise<boolean>
  install: (ctx: ProjectContext) => Promise<void>
  configure: (ctx: ProjectContext) => Promise<void>
  rollback?: (ctx: ProjectContext) => Promise<void>
}
```

### Extensibilité

Créez vos propres plugins :

```bash
npm install @configjs/plugin-react-query
```

ConfigJS détectera et chargera automatiquement les plugins préfixés par `@configjs/plugin-*`.

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](./docs/CONTRIBUTING.md) pour les directives.

### Développer un Plugin

Voir [PLUGIN_DEVELOPMENT.md](./docs/PLUGIN_DEVELOPMENT.md) pour créer vos propres plugins.

### Configuration de Développement

```bash
# Cloner
git clone https://github.com/julien-lin/orchestrateur-framework.git
cd orchestrateur-framework

# Installer les dépendances
npm install

# Lancer les tests
npm run test
npm run test:watch

# Vérification des types
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

---

## 📋 Prérequis

- **Node.js** ≥ 18.0.0
- **npm** / **yarn** / **pnpm** / **bun**
- Un projet React existant (Vite, CRA, ou configuration personnalisée)

---

## 🗺️ Roadmap

### v1.1 ✅ (Actuelle)
- [x] Système de suivi des plugins (.configjsrc)
- [x] Détection des plugins (package.json + tracker)
- [x] UX console améliorée avec couleurs
- [x] Installation séquentielle (prévient la corruption)
- [x] 40+ plugins à travers 10 catégories

### v1.2 (T2 2025)
- [ ] Presets de configuration (templates de démarrage)
- [ ] Marketplace de plugins
- [ ] Commande de mise à jour interactive
- [ ] Assistant de résolution de conflits

### v2.0 (T3 2025)
- [ ] Support Next.js
- [ ] Support Remix
- [ ] Support Astro
- [ ] Interface web pour la configuration

### v2.x (Futur)
- [ ] Support Vue 3
- [ ] Support Svelte
- [ ] Support React Native
- [ ] Templates de plugins personnalisés

---

## 💖 Soutenir ce Projet

Si ConfigJS vous fait gagner du temps et vous facilite la vie, envisagez de sponsoriser le projet :

**[❤️ Sponsoriser sur GitHub](https://github.com/sponsors/julien-lin)**

Votre soutien aide à maintenir et améliorer ConfigJS pour toute la communauté !

---

## 📄 Licence

[MIT](./LICENSE) © [Julien Lin](https://github.com/julien-lin)

---

## 🙏 Remerciements

Inspiré par les meilleures pratiques de :
- [Vite](https://vitejs.dev) - Outil de build ultra-rapide
- [Create T3 App](https://create.t3.gg) - Toolkit full-stack type-safe
- [Projen](https://projen.io) - Configuration de projet en tant que code

---

**Fait avec ❤️ pour la communauté frontend**

[Changelog](./CHANGELOG.md) • [Issues](https://github.com/julien-lin/orchestrateur-framework/issues) • [Contributing](./docs/CONTRIBUTING.md)
