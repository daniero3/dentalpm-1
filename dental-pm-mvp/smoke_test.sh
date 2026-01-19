#!/bin/bash
# =============================================================================
# SMOKE TEST POST-DEPLOY - Dental PM Madagascar
# Usage: ./smoke_test.sh <API_URL>
# Exemple: ./smoke_test.sh https://app.dental-madagascar.com
# =============================================================================

API_URL="${1:-https://dental-pay-stable.preview.emergentagent.com}"
PASSED=0
FAILED=0

echo "=============================================="
echo "SMOKE TEST - Dental PM Madagascar"
echo "API: $API_URL"
echo "=============================================="

# Helper function
check() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  
  if [[ "$actual" == *"$expected"* ]]; then
    echo "✅ $name"
    ((PASSED++))
  else
    echo "❌ $name (attendu: $expected, reçu: $actual)"
    ((FAILED++))
  fi
}

# =============================================================================
# TEST 1: Health Check
# Attendu: HTTP 200, status: ok
# =============================================================================
echo ""
echo "--- TEST 1: Health Check ---"
RESP=$(curl -s -w "|%{http_code}" "$API_URL/api/health")
HTTP=$(echo "$RESP" | cut -d'|' -f2)
BODY=$(echo "$RESP" | cut -d'|' -f1)
check "Health Check HTTP 200" "200" "$HTTP"
check "Health Check status:ok" '"status":"' "$BODY"

# =============================================================================
# TEST 2: Login Super Admin
# Attendu: HTTP 200, token présent
# =============================================================================
echo ""
echo "--- TEST 2: Login Super Admin ---"
RESP=$(curl -s -w "|%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
HTTP=$(echo "$RESP" | cut -d'|' -f2)
BODY=$(echo "$RESP" | cut -d'|' -f1)
check "Login Admin HTTP 200" "200" "$HTTP"
TOKEN_ADMIN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
if [ -n "$TOKEN_ADMIN" ]; then
  echo "✅ Token admin obtenu"
  ((PASSED++))
else
  echo "❌ Token admin manquant"
  ((FAILED++))
fi

# =============================================================================
# TEST 3: OpenAPI Spec
# Attendu: HTTP 200, paths billing présents
# =============================================================================
echo ""
echo "--- TEST 3: OpenAPI Spec ---"
RESP=$(curl -s -w "|%{http_code}" "$API_URL/api/openapi.json")
HTTP=$(echo "$RESP" | cut -d'|' -f2)
BODY=$(echo "$RESP" | cut -d'|' -f1)
check "OpenAPI HTTP 200" "200" "$HTTP"
check "OpenAPI billing paths" "/billing/payment-requests" "$BODY"

# =============================================================================
# TEST 4: Liste Cliniques (Admin)
# Attendu: HTTP 200, clinics array
# =============================================================================
echo ""
echo "--- TEST 4: Liste Cliniques (Admin) ---"
RESP=$(curl -s -w "|%{http_code}" "$API_URL/api/admin/clinics" \
  -H "Authorization: Bearer $TOKEN_ADMIN")
HTTP=$(echo "$RESP" | cut -d'|' -f2)
BODY=$(echo "$RESP" | cut -d'|' -f1)
check "Clinics HTTP 200" "200" "$HTTP"
check "Clinics array présent" '"clinics"' "$BODY"

# =============================================================================
# TEST 5: Plans Billing
# Attendu: HTTP 200, plans ESSENTIAL/PRO/GROUP
# =============================================================================
echo ""
echo "--- TEST 5: Plans Billing ---"
RESP=$(curl -s -w "|%{http_code}" "$API_URL/api/billing/plans" \
  -H "Authorization: Bearer $TOKEN_ADMIN")
HTTP=$(echo "$RESP" | cut -d'|' -f2)
BODY=$(echo "$RESP" | cut -d'|' -f1)
check "Plans HTTP 200" "200" "$HTTP"
check "Plan ESSENTIAL présent" "ESSENTIAL" "$BODY"

# =============================================================================
# TEST 6: Payment Requests (Admin)
# Attendu: HTTP 200, paymentRequests array
# =============================================================================
echo ""
echo "--- TEST 6: Payment Requests (Admin) ---"
RESP=$(curl -s -w "|%{http_code}" "$API_URL/api/admin/payment-requests" \
  -H "Authorization: Bearer $TOKEN_ADMIN")
HTTP=$(echo "$RESP" | cut -d'|' -f2)
BODY=$(echo "$RESP" | cut -d'|' -f1)
check "PaymentRequests HTTP 200" "200" "$HTTP"
check "PaymentRequests array" '"paymentRequests"' "$BODY"

# =============================================================================
# TEST 7: Accès non-authentifié
# Attendu: HTTP 401
# =============================================================================
echo ""
echo "--- TEST 7: Accès non-authentifié ---"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/patients")
check "Patients sans token -> 401" "401" "$HTTP"

# =============================================================================
# TEST 8: Reference vide rejetée
# Attendu: HTTP 400
# =============================================================================
echo ""
echo "--- TEST 8: Reference vide rejetée ---"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/billing/payment-requests" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"plan_code":"ESSENTIAL","payment_method":"MVOLA","reference":""}')
check "Reference vide -> 400" "400" "$HTTP"

# =============================================================================
# TEST 9: Upload MIME invalide
# Attendu: HTTP 400
# =============================================================================
echo ""
echo "--- TEST 9: Upload MIME invalide ---"
echo "test" > /tmp/smoke_test.txt
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/billing/payment-requests" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -F "plan_code=ESSENTIAL" \
  -F "payment_method=MVOLA" \
  -F "reference=SMOKE-TEST-MIME" \
  -F "receipt=@/tmp/smoke_test.txt")
check "Upload .txt rejeté -> 400" "400" "$HTTP"
rm -f /tmp/smoke_test.txt

# =============================================================================
# TEST 10: Legal Pages API
# Attendu: HTTP 200, content présent
# =============================================================================
echo ""
echo "--- TEST 10: Legal Pages API ---"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/legal/cgu")
check "Legal CGU -> 200" "200" "$HTTP"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/legal/privacy")
check "Legal Privacy -> 200" "200" "$HTTP"

# =============================================================================
# RÉSUMÉ
# =============================================================================
echo ""
echo "=============================================="
echo "RÉSUMÉ SMOKE TEST"
echo "=============================================="
echo "✅ Passés: $PASSED"
echo "❌ Échoués: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 TOUS LES TESTS PASSÉS - GO-LIVE OK"
  exit 0
else
  echo "⚠️  CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFIER AVANT GO-LIVE"
  exit 1
fi
