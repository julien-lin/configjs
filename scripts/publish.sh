#!/bin/bash

# Script de publication pour confjs (@configjs/cli)
# Usage: ./scripts/publish.sh

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Publication @configjs/cli sur NPM${NC}\n"

# Vérifier que l'utilisateur est connecté à NPM
if ! npm whoami &> /dev/null; then
  echo -e "${YELLOW}⚠️  Vous n'êtes pas connecté à NPM${NC}"
  echo "Exécutez: npm login"
  exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✓ Connecté à NPM en tant que: ${NPM_USER}${NC}\n"

# Vérifier la version actuelle
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Version actuelle: ${CURRENT_VERSION}${NC}\n"

# Demander confirmation
read -p "Voulez-vous publier la version ${CURRENT_VERSION}? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Publication annulée${NC}"
  exit 0
fi

# Demander l'OTP si nécessaire (pour 2FA)
OTP=""
echo -e "${YELLOW}💡 Si vous avez activé l'authentification à deux facteurs (2FA), vous devrez fournir un OTP${NC}"
read -p "Code OTP (laissez vide si pas de 2FA): " OTP

# Vérifications pré-publication
echo -e "\n${BLUE}🔍 Vérifications pré-publication...${NC}\n"

# 1. TypeScript
echo -e "${BLUE}1/5: Vérification TypeScript...${NC}"
if ! npm run typecheck &> /dev/null; then
  echo -e "${RED}❌ Erreurs TypeScript détectées${NC}"
  npm run typecheck
  exit 1
fi
echo -e "${GREEN}✓ TypeScript OK${NC}\n"

# 2. ESLint
echo -e "${BLUE}2/5: Vérification ESLint...${NC}"
if ! npm run lint &> /dev/null; then
  echo -e "${RED}❌ Erreurs ESLint détectées${NC}"
  npm run lint
  exit 1
fi
echo -e "${GREEN}✓ ESLint OK${NC}\n"

# 3. Tests
echo -e "${BLUE}3/5: Exécution des tests...${NC}"
if ! npm run test:unit &> /dev/null; then
  echo -e "${RED}❌ Tests échoués${NC}"
  npm run test:unit
  exit 1
fi
echo -e "${GREEN}✓ Tests OK${NC}\n"

# 4. Build
echo -e "${BLUE}4/5: Build du package...${NC}"
npm run build
if [ ! -f "dist/cli.js" ]; then
  echo -e "${RED}❌ Build échoué: dist/cli.js introuvable${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Build OK${NC}\n"

# 5. Vérification du package
echo -e "${BLUE}5/5: Vérification du contenu du package...${NC}"
npm pack --dry-run &> /dev/null
echo -e "${GREEN}✓ Package valide${NC}\n"

# Publication
echo -e "${BLUE}📤 Publication sur NPM...${NC}\n"

# Construire la commande de publication avec OTP si fourni
PUBLISH_CMD="npm publish --access public --no-git-checks"
if [ -n "$OTP" ]; then
  PUBLISH_CMD="$PUBLISH_CMD --otp=$OTP"
fi

# Exécuter la publication
if $PUBLISH_CMD; then
  echo -e "\n${GREEN}✅ Publication terminée avec succès!${NC}"
  echo -e "${BLUE}📦 Package: @configjs/cli@${CURRENT_VERSION}${NC}"
  echo -e "${BLUE}🔗 Vérifiez sur: https://www.npmjs.com/package/@configjs/cli${NC}\n"
  
  # Suggérer de créer un tag Git
  read -p "Voulez-vous créer un tag Git v${CURRENT_VERSION}? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git tag "v${CURRENT_VERSION}"
    echo -e "${GREEN}✓ Tag créé: v${CURRENT_VERSION}${NC}"
    echo -e "${YELLOW}💡 Pour pousser le tag: git push origin v${CURRENT_VERSION}${NC}"
  fi
else
  echo -e "\n${RED}❌ Publication échouée${NC}"
  exit 1
fi

