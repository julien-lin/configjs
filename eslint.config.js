import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  // Configuration de base ESLint
  eslint.configs.recommended,

  // Configurations TypeScript recommandées
  ...tseslint.configs.recommendedTypeChecked,

  // Configuration Prettier (doit être en dernier)
  eslintPluginPrettier,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Console rules (utiliser logger au lieu de console)
      // Autoriser console dans les commandes CLI (output utilisateur)
      'no-console': 'off',

      // Security-related rules (TypeScript native)
      // Note: eslint-plugin-security not compatible with ESLint 9 yet
      // Using native TypeScript rules instead
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-dynamic-delete': 'error',
      '@typescript-eslint/restrict-template-expressions': 'warn', // Catches template injection

      // Prettier
      'prettier/prettier': 'error',
    },
  },

  {
    files: ['src/utils/logger.ts'],
    rules: {
      // Autoriser console.log dans le logger (c'est son rôle !)
      'no-console': 'off',
    },
  },

  {
    files: ['src/cli/ui/logo.ts'],
    rules: {
      // Désactiver ESLint pour le fichier du logo avec caractères Unicode complexes
      'prettier/prettier': 'off',
    },
  },

  {
    files: ['src/utils/package-manager.ts', 'src/cli/utils/*-installer.ts'],
    rules: {
      // Ces fichiers utilisent execSync/spawn intentionnellement (avec validation)
      // Les règles les signaleront, ce qui force à documenter pourquoi c'est sûr
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
    },
  },

  // Règles plus souples pour les tests
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
    },
  },

  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '*.config.js',
      '*.config.ts',
      'vitest.config.ts',
      'tests/fixtures/**',
      'src/cli/ui/logo.ts',
    ],
  }
)

