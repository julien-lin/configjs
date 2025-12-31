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
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      
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
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '*.config.js',
      '*.config.ts',
      'vitest.config.ts',
    ],
  }
)

