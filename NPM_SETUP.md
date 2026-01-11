# 📝 Instructions pour Configurer la Publication Automatique

## Étape 1 : Créer un Token npm

1. Connectez-vous sur [npmjs.com](https://www.npmjs.com/login)

2. Allez dans **Access Tokens** :
   - Pour votre compte : `https://www.npmjs.com/settings/VOTRE_USERNAME/tokens`
   - Pour l'organisation configjs : `https://www.npmjs.com/settings/configjs/tokens`

3. Cliquez sur **"Generate New Token"** → **"Classic Token"**

4. Configurez le token :
   - Type : **Automation** (recommandé pour CI/CD)
   - Description : `GitHub Actions - confjs auto-publish`
   
5. **Copiez le token** (commençant par `npm_...`)
   ⚠️ Vous ne pourrez plus le revoir !

---

## Étape 2 : Ajouter le Token dans GitHub

1. Allez sur votre repository GitHub :
   ```
   https://github.com/julien-lin/configjs/settings/secrets/actions
   ```

2. Cliquez sur **"New repository secret"**

3. Créez le secret :
   - **Name** : `NPM_TOKEN`
   - **Secret** : Collez le token npm créé à l'étape 1
   - Cliquez sur **"Add secret"**

---

## Étape 3 : Vérifier la Configuration

### Tester localement

```bash
# 1. Vérifier que tout compile
npm run build
npm run typecheck
npm run lint
npm run test:unit

# 2. Vérifier la version
cat package.json | grep version
```

### Premier Déploiement

```bash
# 1. S'assurer d'être sur main et à jour
git checkout main
git pull

# 2. Créer la première version
npm version patch -m "chore: setup CI/CD"

# 3. Pousser sur GitHub (avec les tags)
git push origin main --follow-tags
```

### Vérifier le Workflow

1. Allez sur : `https://github.com/julien-lin/configjs/actions`
2. Vous devriez voir le workflow "Publish to npm" en cours
3. Attendez ~2-3 minutes
4. Vérifiez que la publication a réussi ✅

### Vérifier sur npm

```bash
# Vérifier que le package est publié
npm view confjs

# Tester l'installation
npx confjs@latest --version
```

---

## Étape 4 : Utilisation Quotidienne

### Publier une Nouvelle Version

```bash
# 1. Faire vos modifications et commit
git add .
git commit -m "feat: nouvelle fonctionnalité"

# 2. Incrémenter la version selon le type de changement
npm version patch   # 0.1.0 → 0.1.1 (bug fixes)
npm version minor   # 0.1.0 → 0.2.0 (nouvelles fonctionnalités)
npm version major   # 0.1.0 → 1.0.0 (breaking changes)

# 3. Pousser sur GitHub
git push origin main --follow-tags

# 4. GitHub Actions publie automatiquement ! 🚀
```

---

## 🔍 Dépannage

### "npm ERR! 401 Unauthorized"

**Problème** : Le token npm n'est pas valide ou a expiré

**Solution** :
1. Créez un nouveau token npm
2. Mettez à jour le secret `NPM_TOKEN` dans GitHub
3. Re-déclenchez le workflow

### "npm ERR! 403 Forbidden"

**Problème** : Le token n'a pas les permissions nécessaires

**Solution** :
1. Créez un nouveau token avec le type **"Automation"**
2. Mettez à jour le secret `NPM_TOKEN`

### "You cannot publish over previously published version"

**Problème** : La version existe déjà sur npm

**Solution** :
```bash
# Incrémenter la version
npm version patch
git push --follow-tags
```

### Le workflow ne se déclenche pas

**Vérifications** :
1. Vous êtes bien sur la branche `main`
2. Vous avez poussé avec `--follow-tags`
3. Le fichier `.github/workflows/publish.yml` existe

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- [.github/CICD_SETUP.md](.github/CICD_SETUP.md) - Guide complet CI/CD
- [DEVELOPPEMENT/PRODUCTION_READINESS.md](DEVELOPPEMENT/PRODUCTION_READINESS.md) - Checklist production

---

**Prêt à publier ?** Suivez les étapes ci-dessus dans l'ordre ! 🚀
