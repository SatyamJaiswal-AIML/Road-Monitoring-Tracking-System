from sqlalchemy import Column, String, Float, DateTime, Integer, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, index=True)
    type = Column(String(32), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    lat = Column(Float, nullable=False)
    long = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    bus_id = Column(String(32), nullable=False, index=True)
    status = Column(String(16), default="open", nullable=False, index=True)
    meta = Column(JSON, default=dict, nullable=False)
