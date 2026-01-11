# Guide Next.js - ConfigJS

Guide complet pour utiliser ConfigJS avec les projets Next.js.

## 📋 Vue d'ensemble

ConfigJS supporte complètement Next.js avec :
- ✅ Détection automatique des projets Next.js
- ✅ Détection App Router vs Pages Router
- ✅ Plugins spécifiques Next.js
- ✅ Plugins compatibles adaptés pour Next.js
- ✅ Création de nouveaux projets Next.js

---

## 🚀 Démarrage rapide

### Projet Next.js existant

```bash
cd votre-projet-nextjs
npx @configjs/cli nextjs
```

ConfigJS va :
1. Détecter votre projet Next.js
2. Détecter le router (App Router ou Pages Router)
3. Proposer les plugins compatibles
4. Installer et configurer automatiquement

### Créer un nouveau projet Next.js

Si aucun projet Next.js n'est détecté, ConfigJS vous propose de créer un nouveau projet :

```bash
npx @configjs/cli nextjs
```

Vous serez guidé pour :
- Nom du projet
- TypeScript ou JavaScript
- ESLint
- TailwindCSS
- `src/` directory
- App Router ou Pages Router
- Import alias `@/*`

Une fois le projet créé, vous pourrez sélectionner les plugins à installer.

---

## 🎯 Détection automatique

### Framework

ConfigJS détecte automatiquement Next.js en vérifiant :
- Présence de `next` dans `dependencies` ou `devDependencies`
- Version de Next.js

### Router

ConfigJS détecte automatiquement le type de router :
- **App Router** : Si le dossier `app/` existe
- **Pages Router** : Si le dossier `pages/` existe
- **Priorité** : Si les deux existent, App Router est prioritaire

Cette information est utilisée pour adapter les configurations des plugins.

---

## 📦 Plugins compatibles Next.js

### Plugins spécifiques Next.js

Ces plugins sont uniquement disponibles pour Next.js :

#### 🖼️ Image Optimization
- **Plugin** : `nextjs-image-optimization`
- **Description** : Configure l'optimisation d'images dans `next.config.js`
- **Fichiers créés/modifiés** :
  - `next.config.js` ou `next.config.ts` avec configuration `images`

#### 🔤 Font Optimization
- **Plugin** : `nextjs-font-optimization`
- **Description** : Configure `next/font` pour optimiser les polices
- **Fichiers créés/modifiés** :
  - `app/layout.tsx` ou `pages/_app.tsx` avec `next/font/google`

#### 🛡️ Middleware
- **Plugin** : `nextjs-middleware`
- **Description** : Crée un template de middleware
- **Fichiers créés** :
  - `middleware.ts` ou `middleware.js` à la racine

#### 🔌 API Routes
- **Plugin** : `nextjs-api-routes`
- **Description** : Crée un exemple d'API route
- **Fichiers créés** :
  - `app/api/hello/route.ts` (App Router) ou `pages/api/hello.ts` (Pages Router)

### Plugins adaptés pour Next.js

Ces plugins ont des variantes spécifiques Next.js :

#### 🎨 TailwindCSS
- **Plugin React** : `tailwindcss`
- **Plugin Next.js** : `tailwindcss-nextjs`
- **Différences** :
  - Configuration `postcss.config.js` adaptée
  - Directives dans `app/globals.css` ou `styles/globals.css`
  - Content paths adaptés pour Next.js

#### 🎨 Shadcn/ui
- **Plugin React** : `shadcn-ui`
- **Plugin Next.js** : `shadcn-ui-nextjs`
- **Différences** :
  - `components.json` avec `rsc: true` (React Server Components)
  - Paths adaptés pour Next.js
  - Utils dans `lib/utils.ts` ou `src/lib/utils.ts`

#### 🔔 React Hot Toast
- **Plugin React** : `react-hot-toast`
- **Plugin Next.js** : `react-hot-toast-nextjs`
- **Différences** :
  - `<Toaster />` injecté dans `app/layout.tsx` (App Router) ou `pages/_app.tsx` (Pages Router)

### Plugins universels compatibles

Ces plugins fonctionnent avec Next.js sans adaptation :

#### 🗂️ State Management
- **Zustand** : `zustand`
- **Jotai** : `jotai`
- **Redux Toolkit** : `@reduxjs/toolkit`

#### 🌐 HTTP
- **Axios** : `axios`
- **TanStack Query** : `@tanstack/react-query`

#### 📝 Forms
- **React Hook Form** : `react-hook-form`
- **Zod** : `zod`

#### 🎨 UI Components
- **React Icons** : `react-icons`
- **Radix UI** : `@radix-ui/react-*`

#### 🛠️ Tooling
- **ESLint** : `eslint`
- **Prettier** : `prettier`
- **date-fns** : `date-fns`

---

## ⚠️ Plugins incompatibles

### React Router
- **Incompatible** : Next.js a son propre système de routing
- **Erreur** : ConfigJS détecte et bloque l'installation de React Router avec Next.js

### Framer Motion
- **Warning** : Peut causer des problèmes avec SSR
- **Recommandation** : Utiliser des alternatives compatibles SSR ou configurer correctement le dynamic import

---

## 📝 Exemples d'utilisation

### Exemple 1 : Projet Next.js avec App Router

```bash
$ npx @configjs/cli nextjs

✔ Choose your language › English

🔍 Detecting context...
   ✓ Framework: nextjs 14.0.0
   ✓ Router: App Router
   ✓ TypeScript: Yes
   ✓ Bundler: nextjs 14.0.0
   ✓ Package manager: npm

✔ CSS / Styling › TailwindCSS (Next.js)
✔ UI Components › Shadcn/ui (Next.js)
✔ UI Components › React Hot Toast (Next.js)
✔ Tooling › Next.js Image Optimization
✔ Tooling › Next.js Font Optimization

✓ 5 libraries selected

✨ Installation completed in 2.1s

📦 Installed packages:
   ✓ tailwindcss (^3.4.1)
   ✓ postcss (^8.4.0)
   ✓ autoprefixer (^10.4.0)
   ✓ class-variance-authority (^0.7.0)
   ✓ react-hot-toast (^2.4.1)
   ...

📝 Created files:
   • tailwind.config.ts
   • postcss.config.js
   • app/globals.css (avec directives TailwindCSS)
   • components.json
   • lib/utils.ts
   • components/ui/button.tsx
   • app/layout.tsx (avec <Toaster />)
   • next.config.ts (avec image optimization)
```

### Exemple 2 : Projet Next.js avec Pages Router

```bash
$ npx @configjs/cli nextjs

🔍 Detecting context...
   ✓ Framework: nextjs 14.0.0
   ✓ Router: Pages Router
   ✓ TypeScript: Yes
   ...

📝 Created files:
   • styles/globals.css (avec directives TailwindCSS)
   • pages/_app.tsx (avec <Toaster />)
   • pages/api/hello.ts (exemple API route)
```

### Exemple 3 : Créer un nouveau projet Next.js

```bash
$ npx @configjs/cli nextjs

🔍 Detecting context...
⚠️  No Next.js project detected

Would you like to create a new Next.js project? (Y/n) › Y

✔ Project name › my-nextjs-app
✔ TypeScript? › Yes
✔ ESLint? › Yes
✔ TailwindCSS? › Yes
✔ src/ directory? › Yes
✔ App Router? › Yes
✔ Import alias (@/*)? › Yes

Creating Next.js project...
✓ Project created successfully

Changing directory to my-nextjs-app...

🔍 Detecting context...
   ✓ Framework: nextjs 14.0.0
   ✓ Router: App Router
   ✓ TypeScript: Yes
   ...

[Continue avec sélection de plugins]
```

---

## 🔧 Configuration spécifique

### App Router vs Pages Router

ConfigJS adapte automatiquement les configurations selon le router détecté :

| Élément | App Router | Pages Router |
|---------|-----------|--------------|
| Layout | `app/layout.tsx` | `pages/_app.tsx` |
| CSS Global | `app/globals.css` | `styles/globals.css` |
| API Routes | `app/api/hello/route.ts` | `pages/api/hello.ts` |
| Fonts | `app/layout.tsx` | `pages/_app.tsx` |

### Structure de fichiers

#### App Router
```
my-nextjs-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       └── hello/
│           └── route.ts
├── components/
│   └── ui/
│       └── button.tsx
├── lib/
│   └── utils.ts
├── next.config.ts
├── tailwind.config.ts
└── postcss.config.js
```

#### Pages Router
```
my-nextjs-app/
├── pages/
│   ├── _app.tsx
│   ├── index.tsx
│   └── api/
│       └── hello.ts
├── components/
│   └── ui/
│       └── button.tsx
├── lib/
│   └── utils.ts
├── styles/
│   └── globals.css
├── next.config.ts
├── tailwind.config.ts
└── postcss.config.js
```

---

## 🎯 Plugins recommandés par catégorie

### CSS / Styling
- ✅ **TailwindCSS (Next.js)** : Framework CSS utilitaire
- ⚠️ **Styled Components** : Compatible mais nécessite configuration SSR
- ⚠️ **Emotion** : Compatible mais nécessite configuration SSR

### UI Components
- ✅ **Shadcn/ui (Next.js)** : Composants accessibles optimisés Next.js
- ✅ **Radix UI** : Composants headless
- ✅ **React Icons** : Bibliothèque d'icônes
- ✅ **React Hot Toast (Next.js)** : Notifications toast

### State Management
- ✅ **Zustand** : State management léger
- ✅ **Jotai** : State management atomique
- ✅ **Redux Toolkit** : State management robuste

### HTTP
- ✅ **Axios** : Client HTTP
- ✅ **TanStack Query** : Data fetching avec cache

### Forms
- ✅ **React Hook Form** : Gestion de formulaires
- ✅ **Zod** : Validation de schémas

### Tooling
- ✅ **ESLint** : Linting
- ✅ **Prettier** : Formatage de code
- ✅ **Next.js Image Optimization** : Optimisation d'images
- ✅ **Next.js Font Optimization** : Optimisation de polices
- ✅ **Next.js Middleware** : Middleware personnalisé
- ✅ **Next.js API Routes** : Routes API

---

## ⚠️ Règles de compatibilité

### Erreurs (bloquantes)

- ❌ **React Router** : Incompatible avec Next.js (Next.js a son propre routing)

### Avertissements (non bloquants)

- ⚠️ **Framer Motion** : Peut causer des problèmes SSR
  - **Solution** : Utiliser `dynamic` import ou alternatives compatibles SSR

### Recommandations

- 💡 **Shadcn/ui** : Utiliser la variante `shadcn-ui-nextjs` pour React Server Components

---

## 🐛 Dépannage

### Le router n'est pas détecté correctement

Si ConfigJS ne détecte pas correctement App Router vs Pages Router :

1. Vérifiez que les dossiers `app/` ou `pages/` existent
2. Si les deux existent, App Router sera prioritaire
3. Vous pouvez forcer la détection en créant/supprimant les dossiers

### Les plugins ne s'adaptent pas au router

Assurez-vous que :
- Le contexte est correctement détecté (`ctx.nextjsRouter`)
- Les plugins utilisent `ctx.nextjsRouter` pour déterminer les chemins
- Les fichiers cibles existent ou peuvent être créés

### Erreurs de configuration

Si une configuration échoue :
- ConfigJS restaure automatiquement les fichiers modifiés
- Vérifiez les logs pour plus de détails
- Utilisez `--dry-run` pour simuler sans modifier

---

## 📚 Ressources

### Documentation officielle Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router](https://nextjs.org/docs/app)
- [Pages Router](https://nextjs.org/docs/pages/building-your-application)

### Plugins Next.js
- [TailwindCSS Next.js](https://tailwindcss.com/docs/guides/nextjs)
- [Shadcn/ui Next.js](https://ui.shadcn.com/docs/installation/next)
- [Next.js Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

---

**Date de création :** 2 janvier 2026  
**Dernière mise à jour :** 2 janvier 2026
