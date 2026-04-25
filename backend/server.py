from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Street Shield API")
api_router = APIRouter(prefix="/api")


# -----------------------
# Models
# -----------------------
class ShieldState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    active: bool = False
    voice_ai: bool = True
    radar: bool = True
    cycling: bool = False
    quick_alert: bool = False
    ai_audio: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ShieldStatePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    active: Optional[bool] = None
    voice_ai: Optional[bool] = None
    radar: Optional[bool] = None
    cycling: Optional[bool] = None
    quick_alert: Optional[bool] = None
    ai_audio: Optional[bool] = None


class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContactCreate(BaseModel):
    name: str
    phone: str


class Location(BaseModel):
    lat: float
    lng: float


class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "SOS"
    message: str = "Emergency dispatch"
    location: Optional[Location] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AlertCreate(BaseModel):
    type: Optional[str] = "SOS"
    message: Optional[str] = "Emergency dispatch"
    location: Optional[Location] = None


class Activity(BaseModel):
    steps: int
    distance_km: float
    active_minutes: int
    safe_routes: int
    last_scan_location: Optional[str] = None


class ShareSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    token: str = Field(default_factory=lambda: uuid.uuid4().hex[:10])
    sender_name: str = "Anonymous"
    active: bool = True
    last_location: Optional[Location] = None
    last_ping_at: Optional[datetime] = None
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stopped_at: Optional[datetime] = None


class ShareStartRequest(BaseModel):
    sender_name: Optional[str] = "Anonymous"
    location: Optional[Location] = None


class SharePingRequest(BaseModel):
    location: Location


# -----------------------
# Helpers
# -----------------------
SHIELD_STATE_KEY = {"_key": "shield_state_singleton"}


def _serialize_dt(d: dict) -> dict:
    """Convert datetime fields to ISO strings before insert."""
    out = {}
    for k, v in d.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = _serialize_dt(v)
        else:
            out[k] = v
    return out


def _parse_dt(d: dict, fields=("created_at", "updated_at")) -> dict:
    for f in fields:
        if f in d and isinstance(d[f], str):
            try:
                d[f] = datetime.fromisoformat(d[f])
            except ValueError:
                pass
    return d


# -----------------------
# Routes
# -----------------------
@api_router.get("/")
async def root():
    return {"message": "Street Shield API online"}


# Shield state (singleton)
@api_router.get("/shield/state", response_model=ShieldState)
async def get_shield_state():
    doc = await db.shield_state.find_one(SHIELD_STATE_KEY, {"_id": 0, "_key": 0})
    if not doc:
        state = ShieldState()
        to_save = {**SHIELD_STATE_KEY, **_serialize_dt(state.model_dump())}
        await db.shield_state.insert_one(to_save)
        return state
    return ShieldState(**_parse_dt(doc))


@api_router.post("/shield/state", response_model=ShieldState)
async def update_shield_state(patch: ShieldStatePatch):
    existing = await db.shield_state.find_one(SHIELD_STATE_KEY, {"_id": 0, "_key": 0})
    base = ShieldState(**_parse_dt(existing)) if existing else ShieldState()
    update_data = patch.model_dump(exclude_unset=True)
    merged = base.model_dump()
    merged.update(update_data)
    merged["updated_at"] = datetime.now(timezone.utc)
    new_state = ShieldState(**merged)

    payload = {**SHIELD_STATE_KEY, **_serialize_dt(new_state.model_dump())}
    await db.shield_state.update_one(SHIELD_STATE_KEY, {"$set": payload}, upsert=True)
    return new_state


# Contacts CRUD
@api_router.get("/contacts", response_model=List[Contact])
async def list_contacts():
    docs = await db.contacts.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [Contact(**_parse_dt(d)) for d in docs]


@api_router.post("/contacts", response_model=Contact)
async def add_contact(payload: ContactCreate):
    if not payload.name.strip() or not payload.phone.strip():
        raise HTTPException(status_code=400, detail="Name and phone required")
    contact = Contact(name=payload.name.strip(), phone=payload.phone.strip())
    await db.contacts.insert_one(_serialize_dt(contact.model_dump()))
    return contact


@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    res = await db.contacts.delete_one({"id": contact_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"deleted": True, "id": contact_id}


# Alerts
@api_router.get("/alerts", response_model=List[Alert])
async def list_alerts():
    docs = await db.alerts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Alert(**_parse_dt(d)) for d in docs]


@api_router.post("/alerts", response_model=Alert)
async def create_alert(payload: AlertCreate):
    alert = Alert(
        type=payload.type or "SOS",
        message=payload.message or "Emergency dispatch",
        location=payload.location,
    )
    doc = _serialize_dt(alert.model_dump())
    await db.alerts.insert_one(doc)
    return alert


# Activity (synthetic - aggregated from alerts/state for now)
@api_router.get("/activity", response_model=Activity)
async def get_activity():
    alert_count = await db.alerts.count_documents({})
    contact_count = await db.contacts.count_documents({})
    # Simple synthetic stats so the dashboard always has plausible values
    return Activity(
        steps=6420 + alert_count * 35,
        distance_km=round(4.8 + alert_count * 0.12, 2),
        active_minutes=47 + alert_count,
        safe_routes=max(3, contact_count + alert_count),
        last_scan_location="Downtown Sector 4",
    )


# Share sessions (live location)
@api_router.post("/share/start", response_model=ShareSession)
async def start_share(payload: ShareStartRequest):
    sess = ShareSession(
        sender_name=(payload.sender_name or "Anonymous").strip()[:60] or "Anonymous",
        last_location=payload.location,
        last_ping_at=datetime.now(timezone.utc) if payload.location else None,
    )
    await db.share_sessions.insert_one(_serialize_dt(sess.model_dump()))
    return sess


@api_router.post("/share/{token}/ping", response_model=ShareSession)
async def ping_share(token: str, payload: SharePingRequest):
    doc = await db.share_sessions.find_one({"token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    if not doc.get("active"):
        raise HTTPException(status_code=410, detail="Session ended")
    update = {
        "last_location": payload.location.model_dump(),
        "last_ping_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.share_sessions.update_one({"token": token}, {"$set": update})
    doc.update(update)
    return ShareSession(**_parse_dt(doc, ("started_at", "stopped_at", "last_ping_at")))


@api_router.get("/share/{token}", response_model=ShareSession)
async def get_share(token: str):
    doc = await db.share_sessions.find_one({"token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return ShareSession(**_parse_dt(doc, ("started_at", "stopped_at", "last_ping_at")))


@api_router.post("/share/{token}/stop", response_model=ShareSession)
async def stop_share(token: str):
    doc = await db.share_sessions.find_one({"token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    update = {
        "active": False,
        "stopped_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.share_sessions.update_one({"token": token}, {"$set": update})
    doc.update(update)
    return ShareSession(**_parse_dt(doc, ("started_at", "stopped_at", "last_ping_at")))


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
