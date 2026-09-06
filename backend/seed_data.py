import json
from datetime import datetime, timedelta
from app.database import SessionLocal, init_db
from app.models import AlertModel

SAMPLE_ROUTE_DELHI = [
    {"lat": 28.6315, "long": 77.2167}, # Connaught Place
    {"lat": 28.6328, "long": 77.2195},
    {"lat": 28.6270, "long": 77.2300}, # Mandi House
    {"lat": 28.6380, "long": 77.2400}, # ITO
    {"lat": 28.6180, "long": 77.2420}, # Pragati Maidan
    {"lat": 28.6139, "long": 77.2090}, # India Gate
    {"lat": 28.6080, "long": 77.2100},
    {"lat": 28.6050, "long": 77.1950}, # Sarojini Nagar
    {"lat": 28.6450, "long": 77.2010}, # Civil Lines
    {"lat": 28.6600, "long": 77.2300}, # Kashmere Gate
]

INITIAL_ALERTS = [
    {
        "id": "ALT-001",
        "type": "incident_hit_and_run",
        "confidence": 0.94,
        "lat": 28.6315,
        "long": 77.2167,
        "bus_id": "BUS-042",
        "status": "open",
        "meta": {"plate_number": "DL 4C AB 2381", "verified_by_bus_count": 1}
    },
    {
        "id": "ALT-002",
        "type": "pothole",
        "confidence": 0.91,
        "lat": 28.6328,
        "long": 77.2195,
        "bus_id": "BUS-017",
        "status": "open",
        "meta": {"verified_by_bus_count": 3}
    },
    {
        "id": "ALT-003",
        "type": "bottleneck",
        "confidence": 0.87,
        "lat": 28.6139,
        "long": 77.2090,
        "bus_id": "BUS-031",
        "status": "acknowledged",
        "meta": {"vehicle_count": 48}
    },
    {
        "id": "ALT-004",
        "type": "pedestrian_risk",
        "confidence": 0.89,
        "lat": 28.6080,
        "long": 77.2100,
        "bus_id": "BUS-009",
        "status": "open",
        "meta": {"verified_by_bus_count": 2}
    },
    {
        "id": "ALT-005",
        "type": "waterlogging",
        "confidence": 0.88,
        "lat": 28.6450,
        "long": 77.2010,
        "bus_id": "BUS-024",
        "status": "open",
        "meta": {"verified_by_bus_count": 1}
    },
    {
        "id": "ALT-006",
        "type": "missing_signboard",
        "confidence": 0.76,
        "lat": 28.6530,
        "long": 77.2215,
        "bus_id": "BUS-011",
        "status": "open",
        "meta": {"verified_by_bus_count": 1}
    },
    {
        "id": "ALT-007",
        "type": "vehicle_density",
        "confidence": 0.95,
        "lat": 28.6270,
        "long": 77.2300,
        "bus_id": "BUS-038",
        "status": "acknowledged",
        "meta": {"vehicle_count": 76}
    },
    {
        "id": "ALT-008",
        "type": "incident_hit_and_run",
        "confidence": 0.83,
        "lat": 28.6200,
        "long": 77.2240,
        "bus_id": "BUS-055",
        "status": "resolved",
        "meta": {"plate_number": "HR 26 BK 7798", "verified_by_bus_count": 2}
    },
    {
        "id": "ALT-009",
        "type": "missing_crossing",
        "confidence": 0.81,
        "lat": 28.6380,
        "long": 77.2400,
        "bus_id": "BUS-003",
        "status": "open",
        "meta": {"verified_by_bus_count": 1}
    },
    {
        "id": "ALT-010",
        "type": "pothole",
        "confidence": 0.96,
        "lat": 28.6500,
        "long": 77.2550,
        "bus_id": "BUS-021",
        "status": "open",
        "meta": {"verified_by_bus_count": 4}
    }
]

def seed():
    init_db()
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        for idx, item in enumerate(INITIAL_ALERTS):
            existing = db.query(AlertModel).filter(AlertModel.id == item["id"]).first()
            if not existing:
                alert = AlertModel(
                    id=item["id"],
                    type=item["type"],
                    confidence=item["confidence"],
                    lat=item["lat"],
                    long=item["long"],
                    timestamp=now - timedelta(minutes=(idx + 1) * 7),
                    bus_id=item["bus_id"],
                    status=item["status"],
                    meta=item["meta"]
                )
                db.add(alert)
        db.commit()
        print(f"[SUCCESS] Seeded {len(INITIAL_ALERTS)} alerts into database.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
