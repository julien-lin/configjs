# 🚀 Quick Reference - CI/CD & Publication

## Configuration Rapide (5 minutes)

### 1. Token npm
```bash
# Créer sur : https://www.npmjs.com/settings/configjs/tokens
Type: Automation
Nom: GitHub Actions - confjs
```

### 2. GitHub Secret
```bash
# Ajouter sur : https://github.com/julien-lin/configjs/settings/secrets/actions
Name: NPM_TOKEN
Value: [votre token npm]
```

### 3. Test
```bash
npm version patch -m "chore: setup CI/CD"
git push origin main --follow-tags
```

---

## Workflow de Publication

```bash
# 1. Développer
git add .
git commit -m "feat: nouvelle feature"

# 2. Nouvelle version
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0
npm version major   # 0.1.0 → 1.0.0

# 3. Publier
git push origin main --follow-tags

# ✨ Automatique ! GitHub Actions → npm
```

---

## Vérifications

```bash
# Workflow GitHub
https://github.com/julien-lin/configjs/actions

# Package npm
npm view confjs version

# Test installation
npx confjs@latest --version
```

---

## Commandes Utiles

```bash
# Voir version actuelle
npm version

# Voir version sur npm
npm view confjs version

# Installer localement
npm install -g .

# Tester CLI
confjs react --help

# Nettoyer
rm -rf node_modules dist
npm install && npm run build
```

---

## Débogage

### Publication échoue ?
```bash
# Vérifier token npm dans GitHub Secrets
# Créer nouveau token si nécessaire
```

### Version déjà publiée ?
```bash
npm version patch
git push --follow-tags
```

### Tests échouent ?
```bash
npm run test:unit
npm run test:integration
npm run typecheck
npm run lint
```

---

**Docs complètes** : [NPM_SETUP.md](NPM_SETUP.md) | [.github/CICD_SETUP.md](.github/CICD_SETUP.md)
