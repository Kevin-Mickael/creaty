#!/bin/bash
# DIAGNOSTIC RAPIDE - Pourquoi 400?

API="https://admin.creatymu.org/api"
SLUG="digital-social-media-agency-mauritius-creaty"

echo "========================================="
echo "DIAGNOSTIC STRAPI - Erreur 400"
echo "========================================="
echo ""

# Test 1: API accessible?
echo "[1/5] L'API répond-elle?"
if curl -s -o /dev/null -w "%{http_code}" "$API/articles?pagination[limit]=1"; then
  echo " → API en ligne ✓"
else
  echo " → API DOWN ✗"
  exit 1
fi
echo ""

# Test 2: Articles existent?
echo "[2/5] Articles existent-ils?"
response=$(curl -s "$API/articles?pagination[limit]=1")
count=$(echo "$response" | grep -o '"id"' | wc -l)
if [ "$count" -gt 0 ]; then
  echo " → Trouvé $count article(s) ✓"
else
  echo " → Aucun article ✗"
fi
echo ""

# Test 3: Permission public?
echo "[3/5] Permissions publiques?"
# Try to fetch without auth
response=$(curl -s -w "\n%{http_code}" "$API/articles?pagination[limit]=1")
http_code=$(echo "$response" | tail -1)
if [ "$http_code" = "200" ]; then
  echo " → Public peut lire ✓"
else
  echo " → Public ne peut pas lire (HTTP $http_code) ✗"
fi
echo ""

# Test 4: Slug exact?
echo "[4/5] Article avec ce slug existe?"
response=$(curl -s "$API/articles?filters[slug][\$eq]=$SLUG&pagination[limit]=1")
if echo "$response" | grep -q "$SLUG"; then
  echo " → Slug trouvé ✓"
else
  echo " → Slug NOT trouvé ✗"
  echo "   Slugs disponibles:"
  echo "$response" | grep -o '"slug":"[^"]*"' | head -5
fi
echo ""

# Test 5: Article publié?
echo "[5/5] Article est-il publié (pas Draft)?"
response=$(curl -s "$API/articles?filters[slug][\$eq]=$SLUG&pagination[limit]=1")
if echo "$response" | grep -q '"publishedAt"'; then
  echo " → Article publié ✓"
else
  echo " → Article est en DRAFT ✗"
fi
echo ""

echo "========================================="
echo "SOLUTIONS:"
echo "========================================="
echo "Si [3] échoue:"
echo "  1. Strapi Admin → Settings → Roles"
echo "  2. Cliquer 'Public'"
echo "  3. Articles → find et findOne → Cocher ✓"
echo "  4. Cliquer Save"
echo ""
echo "Si [4] ou [5] échoue:"
echo "  1. Strapi Admin → Content Manager"
echo "  2. Vérifier l'article existe"
echo "  3. Vérifier son SLUG est correct"
echo "  4. Cliquer 'Publish' (pas Draft)"
echo ""
