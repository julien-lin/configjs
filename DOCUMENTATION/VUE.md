# Guide Vue.js

Ce guide explique comment utiliser ConfigJS avec des projets Vue.js.

## 🚀 Quick Start

### Projet existant

Si vous avez déjà un projet Vue.js :

```bash
cd votre-projet-vue
npx @configjs/cli vue
```

ConfigJS va :
1. 🔍 Détecter votre environnement (Vue 3, Composition/Options API, TypeScript, Vite)
2. 🎯 Vous guider dans la sélection des bibliothèques par catégorie
3. 📦 Installer tous les packages séquentiellement (sans conflits)
4. ⚙️ Configurer tout avec du code fonctionnel
5. ✅ Valider la compatibilité et les dépendances
6. 🎉 Terminé ! Votre projet est prêt pour la production

### Créer un nouveau projet

Si vous n'avez pas encore de projet Vue.js :

```bash
npx @configjs/cli vue
```

ConfigJS va vous proposer de créer un nouveau projet avec Vite. Vous pourrez choisir :
- ✅ TypeScript
- ✅ Vue Router
- ✅ Pinia
- ✅ Vitest
- ✅ ESLint
- ✅ Prettier

## 📋 Détection automatique

### Vue Version

ConfigJS détecte automatiquement la version de Vue.js :
- **Vue 3 uniquement** : ConfigJS supporte uniquement Vue 3 (Vue 2 n'est plus supporté par Vite)

### API Style

ConfigJS détecte automatiquement le style d'API utilisé :
- **Composition API** : Détecté si les fichiers `.vue` contiennent `<script setup>` ou `setup()`
- **Options API** : Détecté si les fichiers `.vue` contiennent `export default { ... }`

Les plugins s'adaptent automatiquement selon le style détecté :
- Vue Router génère des vues avec `<script setup>` pour Composition API
- Vue Router génère des vues avec `export default` pour Options API

## 📦 Plugins compatibles Vue.js

### 🛣️ Routing
- **Vue Router** (v4) : Router officiel pour Vue.js 3
  - Configuration automatique avec `src/router/index.ts`
  - Création de vues d'exemple (HomeView, AboutView)
  - Intégration dans `src/main.ts` et `src/App.vue`

### 🗄️ State Management
- **Pinia** : State management officiel pour Vue.js 3
  - Configuration automatique avec `src/stores/index.ts`
  - Création d'un store exemple (counter)
  - Intégration dans `src/main.ts`

### 🎨 UI Components
- **Vuetify** : Framework UI Material Design pour Vue.js 3
  - Configuration automatique avec `src/plugins/vuetify.ts`
  - Composant exemple HelloVuetify
  - Intégration dans `src/main.ts` et `vite.config.ts`

### 🔧 Utils
- **VueUse** : Collection de composables Vue Composition API
  - Création d'un composable exemple `useExample.ts`
  - Exemples d'utilisation de `useMouse` et `useCounter`

### 🧪 Testing
- **Vue Test Utils** : Utilitaires de test pour Vue.js
  - Configuration automatique pour Vitest
  - Exemples de tests pour composants Vue

### 🛠️ Tooling
- **ESLint Vue** : Configuration ESLint pour Vue.js
  - `eslint-plugin-vue` avec règles recommandées
  - Support TypeScript avec `@vue/eslint-config-prettier`
  - Configuration dans `eslint.config.js`

### 🌐 HTTP Client
- **Axios** : Client HTTP avec interceptors
  - Compatible avec Vue.js (peut être utilisé avec Composition API ou Options API)

### 🎨 CSS / Styling
- **TailwindCSS** : Framework CSS utility-first
  - Compatible avec Vue.js
  - Configuration automatique pour Vite

## 🔄 Composition API vs Options API

### Composition API

Les plugins génèrent du code utilisant Composition API :

```vue
<template>
  <div class="home">
    <h1>Home</h1>
  </div>
</template>

<script setup>
// Composition API
</script>
```

### Options API

Les plugins génèrent du code utilisant Options API :

```vue
<template>
  <div class="home">
    <h1>Home</h1>
  </div>
</template>

<script>
export default {
  name: 'HomeView',
}
</script>
```

## 📝 Exemples d'utilisation

### Installation de Vue Router

```bash
npx @configjs/cli vue
# Sélectionner "Vue Router" dans la catégorie Routing
```

ConfigJS va :
1. Installer `vue-router@4`
2. Créer `src/router/index.ts` avec la configuration du router
3. Créer `src/views/HomeView.vue` et `src/views/AboutView.vue`
4. Modifier `src/main.ts` pour intégrer le router
5. Modifier `src/App.vue` pour ajouter `<router-view>`

### Installation de Pinia

```bash
npx @configjs/cli vue
# Sélectionner "Pinia" dans la catégorie State Management
```

ConfigJS va :
1. Installer `pinia`
2. Créer `src/stores/index.ts` avec la configuration Pinia
3. Créer `src/stores/counter.ts` avec un store exemple
4. Modifier `src/main.ts` pour intégrer Pinia

### Installation de Vuetify

```bash
npx @configjs/cli vue
# Sélectionner "Vuetify" dans la catégorie UI Components
```

ConfigJS va :
1. Installer `vuetify`, `@mdi/font`, `sass`
2. Créer `src/plugins/vuetify.ts` avec la configuration Vuetify
3. Créer `src/components/HelloVuetify.vue` avec un composant exemple
4. Modifier `src/main.ts` pour intégrer Vuetify
5. Modifier `vite.config.ts` pour ajouter le plugin Vuetify

## ⚠️ Règles de compatibilité

ConfigJS valide automatiquement la compatibilité des plugins :

### Incompatibilités détectées

- ❌ **React Router** avec Vue.js → Utilisez **Vue Router**
- ❌ **Zustand/Redux** avec Vue.js → Utilisez **Pinia**
- ❌ **Shadcn/ui** avec Vue.js → Utilisez **Vuetify** ou **Quasar**

### Warnings

- ⚠️ **Vue Router version** : Assurez-vous que la version correspond à Vue.js (Vue Router 4 pour Vue 3)

## 🎯 Structure de projet générée

Après installation, votre projet aura cette structure :

```
votre-projet/
├── src/
│   ├── router/
│   │   └── index.ts          # Configuration Vue Router
│   ├── views/
│   │   ├── HomeView.vue      # Vue d'exemple
│   │   └── AboutView.vue     # Vue d'exemple
│   ├── stores/
│   │   ├── index.ts          # Configuration Pinia
│   │   └── counter.ts        # Store exemple
│   ├── composables/
│   │   └── useExample.ts     # Composable exemple (VueUse)
│   ├── plugins/
│   │   └── vuetify.ts        # Configuration Vuetify
│   ├── components/
│   │   └── HelloVuetify.vue  # Composant exemple Vuetify
│   ├── main.ts               # Point d'entrée (modifié)
│   └── App.vue               # Composant racine (modifié)
├── vite.config.ts            # Configuration Vite (modifié si Vuetify)
└── eslint.config.js          # Configuration ESLint (modifié si ESLint Vue)
```

## 🔍 Commandes disponibles

```bash
# Installation interactive
npx @configjs/cli vue

# Lister les plugins disponibles pour Vue.js
npx @configjs/cli list

# Vérifier les plugins installés
npx @configjs/cli installed

# Valider la compatibilité
npx @configjs/cli check
```

## 📚 Ressources

- [Documentation Vue.js](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [VueUse](https://vueuse.org/)
- [Vuetify](https://vuetifyjs.com/)
- [Vite](https://vitejs.dev/)

## 🐛 Dépannage

### Vue 2 détecté

Si ConfigJS détecte Vue 2, il refusera de continuer car Vue 2 n'est plus supporté par Vite. Migrez vers Vue 3.

### API style non détecté

Si ConfigJS ne peut pas détecter le style d'API, il utilisera Composition API par défaut (recommandé pour Vue 3).

### Conflits de plugins

ConfigJS détecte automatiquement les conflits et vous avertit. Par exemple, si vous essayez d'installer React Router avec Vue.js, ConfigJS vous suggérera d'utiliser Vue Router à la place.
