import os
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, Numeric, ForeignKey, func
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import List

app = FastAPI(title="Recommendation Service", version="1.0.0")

# Database Connection configuration
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "rootpassword")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "travel_microservice")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Models
class Destination(Base):
    __tablename__ = "destinations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    city = Column(String(255), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    description = Column(String, nullable=True)
    image = Column(String(512), nullable=True)

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, nullable=False)
    destinationId = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    totalPerson = Column(Integer, nullable=False)
    totalPrice = Column(Numeric(10, 2), nullable=False)

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/recommendations/{user_id}")
def get_recommendations(user_id: int, db: Session = Depends(get_db)):
    try:
        # 1. Get most popular destinations (count by booking occurrences)
        popular_query = (
            db.query(Destination.name, func.count(Booking.id).label("booking_count"))
            .join(Booking, Destination.id == Booking.destinationId)
            .group_by(Destination.id)
            .order_by(func.count(Booking.id).desc())
            .limit(3)
            .all()
        )
        popular = [item[0] for item in popular_query]

        # 2. Get most expensive destinations
        expensive_query = (
            db.query(Destination.name)
            .order_by(Destination.price.desc())
            .limit(3)
            .all()
        )
        expensive = [item[0] for item in expensive_query]

        # Combine results uniquely (preserving order: popular first, then expensive)
        recommendations = []
        for name in popular + expensive:
            if name not in recommendations:
                recommendations.append(name)

        # Fallback in case DB is empty
        if not recommendations:
            recommendations = ["Bali", "Labuan Bajo", "Lombok"]

        return {"recommendations": recommendations[:5]}
    except Exception as e:
        # In case of DB failure or during initial start, fallback elegantly
        print(f"Error generating recommendations: {e}")
        return {"recommendations": ["Bali", "Labuan Bajo", "Lombok"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
