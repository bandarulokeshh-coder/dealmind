import sys
sys.path.insert(0, ".")
from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

print("GET /api/health", c.get("/api/health").json())
print("POST /api/demo/seed", c.post("/api/demo/seed").json())
print("GET /api/customers", c.get("/api/customers").json()[:1])

# get customer id
cid = c.get("/api/customers").json()[0]["id"]
print("cid", cid)

# chat 1
r = c.post("/api/chat", json={"customer_id": cid, "message": "Our budget is ₹10 lakh."})
print("chat1", r.json())

# chat 2
r = c.post("/api/chat", json={"customer_id": cid, "message": "We require on-premise deployment due to privacy."})
print("chat2", r.json())

# chat 3 recommend
r = c.post("/api/chat", json={"customer_id": cid, "message": "What do you recommend for us?"})
j = r.json()
print("chat3 answer snippet", j["answer"][:300])
print("evidence", j["evidence"][:2])
print("memory", j["memory"])

print("GET memory", c.get(f"/api/customers/{cid}/memory").json())
print("GET dashboard", c.get("/api/dashboard").json())
print("OK")
