#!/bin/bash
# Smoke Test Script - Dental PM MVP
# Tests all critical API endpoints

API_URL="https://saas-theme-upgrade.preview.emergentagent.com"
PASS=0
FAIL=0
RESULTS=""

log_result() {
  local name="$1"
  local status="$2"
  local detail="$3"
  if [ "$status" = "PASS" ]; then
    PASS=$((PASS + 1))
    RESULTS="$RESULTS\n✅ $name"
  else
    FAIL=$((FAIL + 1))
    RESULTS="$RESULTS\n❌ $name: $detail"
  fi
  echo "$status: $name $detail"
}

# 1) Health check (no auth required)
echo "=== 1) Health Check ==="
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")
if [ "$HTTP" = "200" ]; then
  log_result "/api/health" "PASS"
else
  log_result "/api/health" "FAIL" "HTTP $HTTP"
fi

# 2) Login
echo "=== 2) Login ==="
RESP=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || echo "")
if [ -n "$TOKEN" ]; then
  log_result "POST /api/auth/login" "PASS"
else
  log_result "POST /api/auth/login" "FAIL" "No token"
  echo "Cannot continue without token"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

# 3) Patients list
echo "=== 3) Patients List ==="
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$API_URL/api/patients")
if [ "$HTTP" = "200" ]; then
  log_result "GET /api/patients" "PASS"
else
  log_result "GET /api/patients" "FAIL" "HTTP $HTTP"
fi

# Get existing patient for tests
PATIENT_ID=$(curl -s -H "$AUTH" "$API_URL/api/patients" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['patients'][0]['id'] if d.get('patients') else '')" 2>/dev/null)
echo "Using PATIENT_ID: $PATIENT_ID"

# 4) Create patient (with correct field name)
echo "=== 4) Create Patient ==="
UNIQUE_PHONE="+2613400$(date +%s | tail -c 6)"
PATIENT_RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$API_URL/api/patients" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Smoke\",\"last_name\":\"Test$(date +%s)\",\"date_of_birth\":\"1990-01-01\",\"gender\":\"M\",\"phone_primary\":\"$UNIQUE_PHONE\"}")
PATIENT_HTTP=$(echo "$PATIENT_RESP" | grep "HTTP:" | cut -d: -f2)
NEW_PATIENT_ID=$(echo "$PATIENT_RESP" | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',d.get('patient',{}).get('id','')))" 2>/dev/null || echo "")
if [ "$PATIENT_HTTP" = "201" ]; then
  log_result "POST /api/patients" "PASS"
  if [ -n "$NEW_PATIENT_ID" ]; then
    PATIENT_ID="$NEW_PATIENT_ID"
  fi
else
  log_result "POST /api/patients" "FAIL" "HTTP $PATIENT_HTTP"
fi

# Get schedule ID
SCHEDULE_ID=$(curl -s -H "$AUTH" "$API_URL/api/pricing-schedules" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['schedules'][0]['id'] if d.get('schedules') else '')" 2>/dev/null)
echo "Using SCHEDULE_ID: $SCHEDULE_ID"

# 5) Create quote
echo "=== 5) Create Quote ==="
QUOTE_RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$API_URL/api/quotes" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"patient_id\":\"$PATIENT_ID\",\"schedule_id\":\"$SCHEDULE_ID\",\"items\":[{\"procedure_code\":\"SMOKE01\",\"description\":\"Test Smoke\",\"quantity\":1,\"unit_price_mga\":10000}],\"notes\":\"Smoke test quote\"}")
QUOTE_HTTP=$(echo "$QUOTE_RESP" | grep "HTTP:" | cut -d: -f2)
QUOTE_ID=$(echo "$QUOTE_RESP" | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('quote',{}).get('id',''))" 2>/dev/null || echo "")
if [ "$QUOTE_HTTP" = "201" ]; then
  log_result "POST /api/quotes" "PASS"
else
  log_result "POST /api/quotes" "FAIL" "HTTP $QUOTE_HTTP"
fi

# 5b) Convert quote to invoice
echo "=== 5b) Convert Quote ==="
if [ -n "$QUOTE_ID" ]; then
  CONVERT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/quotes/$QUOTE_ID/convert" -H "$AUTH")
  if [ "$CONVERT_HTTP" = "201" ] || [ "$CONVERT_HTTP" = "200" ]; then
    log_result "POST /api/quotes/:id/convert" "PASS"
  else
    log_result "POST /api/quotes/:id/convert" "FAIL" "HTTP $CONVERT_HTTP"
  fi
else
  log_result "POST /api/quotes/:id/convert" "FAIL" "No quote ID"
fi

# 6) Create invoice
echo "=== 6) Create Invoice ==="
INV_RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$API_URL/api/invoices" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"patient_id\":\"$PATIENT_ID\",\"schedule_id\":\"$SCHEDULE_ID\",\"items\":[{\"procedure_code\":\"INV01\",\"description\":\"Test Invoice\",\"quantity\":1,\"unit_price_mga\":50000}]}")
INV_HTTP=$(echo "$INV_RESP" | grep "HTTP:" | cut -d: -f2)
INV_ID=$(echo "$INV_RESP" | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('invoice',{}).get('id',''))" 2>/dev/null || echo "")
if [ "$INV_HTTP" = "201" ]; then
  log_result "POST /api/invoices" "PASS"
else
  log_result "POST /api/invoices" "FAIL" "HTTP $INV_HTTP"
fi
echo "Using INV_ID: $INV_ID"

# 7) Add payment
echo "=== 7) Add Payment ==="
if [ -n "$INV_ID" ]; then
  PAY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/invoices/$INV_ID/payments" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"amount_mga":25000,"payment_method":"CASH","reference":"SMOKE-PAY"}')
  if [ "$PAY_HTTP" = "201" ]; then
    log_result "POST /api/invoices/:id/payments" "PASS"
  else
    log_result "POST /api/invoices/:id/payments" "FAIL" "HTTP $PAY_HTTP"
  fi
else
  log_result "POST /api/invoices/:id/payments" "FAIL" "No invoice ID"
fi

# 8) Download invoice PDF
echo "=== 8) Invoice PDF ==="
if [ -n "$INV_ID" ]; then
  PDF_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$API_URL/api/invoices/$INV_ID/pdf")
  if [ "$PDF_HTTP" = "200" ]; then
    log_result "GET /api/invoices/:id/pdf" "PASS"
  else
    log_result "GET /api/invoices/:id/pdf" "FAIL" "HTTP $PDF_HTTP"
  fi
else
  log_result "GET /api/invoices/:id/pdf" "FAIL" "No invoice ID"
fi

# 9) Upload document
echo "=== 9) Upload Document ==="
echo "test content" > /tmp/smoke_test.pdf
DOC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/documents/upload" \
  -H "$AUTH" \
  -F "file=@/tmp/smoke_test.pdf;type=application/pdf" \
  -F "patient_id=$PATIENT_ID" \
  -F "category=AUTRE")
if [ "$DOC_HTTP" = "201" ]; then
  log_result "POST /api/documents/upload" "PASS"
else
  log_result "POST /api/documents/upload" "FAIL" "HTTP $DOC_HTTP"
fi

# 10) Prescription create + issue + pdf
echo "=== 10) Prescription Flow ==="
PRESC_RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$API_URL/api/patients/$PATIENT_ID/prescriptions" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"content":{"items":[{"medication":"Paracetamol","dosage":"500mg","posology":"3x/jour"}],"notes":"Smoke test"}}')
PRESC_HTTP=$(echo "$PRESC_RESP" | grep "HTTP:" | cut -d: -f2)
PRESC_ID=$(echo "$PRESC_RESP" | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('prescription',{}).get('id',''))" 2>/dev/null || echo "")
if [ "$PRESC_HTTP" = "201" ]; then
  log_result "POST /api/patients/:id/prescriptions" "PASS"
  
  # Issue
  ISSUE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/prescriptions/$PRESC_ID/issue" -H "$AUTH")
  if [ "$ISSUE_HTTP" = "200" ]; then
    log_result "POST /api/prescriptions/:id/issue" "PASS"
  else
    log_result "POST /api/prescriptions/:id/issue" "FAIL" "HTTP $ISSUE_HTTP"
  fi
  
  # PDF
  PRESC_PDF_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$API_URL/api/prescriptions/$PRESC_ID/pdf")
  if [ "$PRESC_PDF_HTTP" = "200" ]; then
    log_result "GET /api/prescriptions/:id/pdf" "PASS"
  else
    log_result "GET /api/prescriptions/:id/pdf" "FAIL" "HTTP $PRESC_PDF_HTTP"
  fi
else
  log_result "POST /api/patients/:id/prescriptions" "FAIL" "HTTP $PRESC_HTTP"
  log_result "POST /api/prescriptions/:id/issue" "FAIL" "No prescription"
  log_result "GET /api/prescriptions/:id/pdf" "FAIL" "No prescription"
fi

# 11) Odontogram save
echo "=== 11) Odontogram ==="
ODON_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$API_URL/api/patients/$PATIENT_ID/odontogram" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"teeth":[{"tooth_fdi":"21","status":"HEALTHY"}]}')
if [ "$ODON_HTTP" = "200" ]; then
  log_result "PUT /api/patients/:id/odontogram" "PASS"
else
  log_result "PUT /api/patients/:id/odontogram" "FAIL" "HTTP $ODON_HTTP"
fi

# 12) Inventory alerts
echo "=== 12) Inventory Alerts ==="
ALERTS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$API_URL/api/inventory/alerts")
if [ "$ALERTS_HTTP" = "200" ]; then
  log_result "GET /api/inventory/alerts" "PASS"
else
  log_result "GET /api/inventory/alerts" "FAIL" "HTTP $ALERTS_HTTP"
fi

# 13) Lab order create
echo "=== 13) Lab Order ==="
LAB_RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$API_URL/api/labs/orders" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"patient_id\":\"$PATIENT_ID\",\"work_type\":\"CROWN\",\"due_date\":\"2026-04-01\"}")
LAB_HTTP=$(echo "$LAB_RESP" | grep "HTTP:" | cut -d: -f2)
if [ "$LAB_HTTP" = "201" ]; then
  log_result "POST /api/labs/orders" "PASS"
else
  log_result "POST /api/labs/orders" "FAIL" "HTTP $LAB_HTTP"
fi

# 14) Reports finance
echo "=== 14) Reports Finance ==="
REPORT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$API_URL/api/reports/finance")
if [ "$REPORT_HTTP" = "200" ]; then
  log_result "GET /api/reports/finance" "PASS"
else
  log_result "GET /api/reports/finance" "FAIL" "HTTP $REPORT_HTTP"
fi

# Summary
echo ""
echo "============================================"
echo "        SMOKE TEST RESULTS"
echo "============================================"
echo -e "$RESULTS"
echo ""
echo "============================================"
echo "TOTAL: $PASS PASS / $FAIL FAIL"
echo "============================================"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
exit 0
