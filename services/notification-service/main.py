import logging
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NotificationService")

app = FastAPI(title="Notification Service", version="1.0.0")

class EmailPayload(BaseModel):
    to: str
    subject: str

@app.post("/notifications/email")
def send_email_notification(payload: EmailPayload):
    # Simulated log output
    logger.info("=" * 50)
    logger.info("SIMULATION: SENDING EMAIL")
    logger.info(f"Recipient : {payload.to}")
    logger.info(f"Subject   : {payload.subject}")
    logger.info("Status    : Sent Successfully")
    logger.info("=" * 50)
    
    return {"message": "Email Sent Successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5002, reload=True)
