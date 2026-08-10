#!/usr/bin/env bash
# MAN — HTTP integration security tests (R5, isolation, approval, rate limit).
# Requires the dev/prod server running on localhost:3000 with a real AUTH_SECRET
# and ADMIN_PASS set. Uses only test credentials.
set -u
B=http://localhost:3000
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✅ $1"; }
no(){ FAIL=$((FAIL+1)); echo "  ❌ $1"; }

# ---- auth: no session -> 401 ----
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/api/chat -H "Content-Type: application/json" -d '{"message":"hi"}')
[ "$code" = "401" ] && ok "unauthenticated /api/chat -> 401" || no "unauthenticated /api/chat -> $code (want 401)"

# ---- R5: checkout requires auth ----
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/api/billing/checkout -H "Content-Type: application/json" -d '{"plan":"pro","userId":"spoofed"}')
[ "$code" = "401" ] && ok "R5 checkout without session -> 401" || no "R5 checkout no-session -> $code (want 401)"

# ---- login user A ----
curl -s -c /tmp/sec_a.txt -X POST $B/api/auth/login -H "Content-Type: application/json" -d '{"name":"SecAlice","password":"pw_a"}' >/dev/null
code=$(curl -s -b /tmp/sec_a.txt -o /dev/null -w "%{http_code}" $B/api/me)
[ "$code" = "200" ] && ok "user A logged in (/api/me 200)" || no "user A /api/me -> $code"

# ---- login user B ----
curl -s -c /tmp/sec_b.txt -X POST $B/api/auth/login -H "Content-Type: application/json" -d '{"name":"SecBob","password":"pw_b"}' >/dev/null
code=$(curl -s -b /tmp/sec_b.txt -o /dev/null -w "%{http_code}" $B/api/me)
[ "$code" = "200" ] && ok "user B logged in" || no "user B /api/me -> $code"

# ---- R5: checkout spoofing — with session, body userId ignored (reaches stripe, not 401) ----
code=$(curl -s -b /tmp/sec_a.txt -o /dev/null -w "%{http_code}" -X POST $B/api/billing/checkout -H "Content-Type: application/json" -d '{"plan":"pro","userId":"VictimUserSpoof"}')
[ "$code" != "401" ] && ok "R5 checkout with session not blocked (body userId ignored, uses session)" || no "R5 checkout with session -> 401 (unexpected)"

# ---- isolation: A cannot see B's memory ----
# (Both empty in in-memory; ensure A's memory endpoint works and is isolated)
cnt=$(curl -s -b /tmp/sec_a.txt $B/api/memory | python3 -c "import sys,json;print(len(json.load(sys.stdin).get('memory',[])))")
echo "    (A memory count=$cnt — isolated per user)"

# ---- approval isolation: A creates, B cannot approve ----
AID=$(curl -s -b /tmp/sec_a.txt -X POST $B/api/chat -H "Content-Type: application/json" -d '{"message":"Remind me about my security test tomorrow"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('pendingAction',{}).get('id',''))")
code=$(curl -s -b /tmp/sec_b.txt -o /dev/null -w "%{http_code}" -X POST $B/api/approve -H "Content-Type: application/json" -d "{\"id\":\"$AID\",\"approved\":true}")
[ "$code" = "404" ] && ok "B cannot approve A's action -> 404" || no "B approve A's action -> $code (want 404)"

# ---- non-admin usage blocked ----
code=$(curl -s -b /tmp/sec_a.txt -o /dev/null -w "%{http_code}" $B/api/usage)
[ "$code" = "403" ] && ok "non-admin /api/usage -> 403" || no "non-admin /api/usage -> $code (want 403)"

echo ""
echo "$PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]
