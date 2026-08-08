#!/bin/bash
# Endpoint smoke test: login as Maya, hit every module's main endpoint.
set -e
BASE="http://localhost:3000"

echo "=== Auth ==="
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"maya@hangout.app","password":"password123"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "  login: token len ${#TOKEN}"

echo "=== /auth/me ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/auth/me" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  user: {d[\"username\"]} ({d[\"displayName\"]}), friends: {len(d[\"friends\"])}')"

echo "=== /users/search ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/users/search?q=leo" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  found {len(d)} users: {[u[\"username\"] for u in d]}')"

echo "=== /friends ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/friends" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  {len(d)} friends: {[f[\"username\"] for f in d]}')"

echo "=== /friends/requests ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/friends/requests" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  incoming: {len(d[\"incoming\"])}, outgoing: {len(d[\"outgoing\"])}')"

echo "=== /places ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/places" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  {len(d)} places: {[p[\"name\"] for p in d[:3]]}...')"

echo "=== /places?q=arcade ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/places?q=arcade" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  {len(d)} results: {[p[\"name\"] for p in d]}')"

echo "=== /hangouts?scope=upcoming ==="
HID=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/hangouts?scope=upcoming" | python -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id']); ")
echo "  hangout id: ${HID:0:12}..."

echo "=== /hangouts/:id ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/hangouts/$HID" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  title: {d[\"title\"]}, dest: {d.get(\"destination\",{}).get(\"name\",\"?\")}, participants: {len(d[\"participants\"])}')"

echo "=== /hangouts/:id/votes ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/hangouts/$HID/votes" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  vote results: {len(d)} entries')"

echo "=== /hangouts/:id/messages ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/hangouts/$HID/messages" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  {len(d)} messages: {[m[\"body\"][:30] for m in d[:3]]}')"

echo "=== /discovery ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/discovery" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  public hangouts: {len(d[\"nearbyPublicHangouts\"])}, trending: {len(d[\"trendingPlaces\"])}, friends activity: {len(d[\"friendsActivity\"])}')"

echo "=== /notifications ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/notifications" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  {len(d[\"items\"])} notifs, {d[\"unreadCount\"]} unread')"

echo "=== /notifications/unread-count ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/notifications/unread-count" | python -c "import json,sys; d=json.load(sys.stdin); print(f'  unread: {d.get(\"count\", d)}')"

echo ""
echo "=== ALL ENDPOINTS PASSED ==="
