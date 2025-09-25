from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models for Tinnitus App
class AudioSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    noise_types: Dict[str, Dict[str, Any]] = Field(default_factory=dict)  # white, pink, brown, gray, blue
    specific_frequencies: List[Dict[str, Any]] = Field(default_factory=list)
    frequency_ranges: List[Dict[str, Any]] = Field(default_factory=list)
    notch_filters: List[Dict[str, Any]] = Field(default_factory=list)
    burst_settings: Dict[str, Any] = Field(default_factory=dict)
    timer_duration: Optional[int] = None  # in seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AudioSettingsCreate(BaseModel):
    name: str
    noise_types: Optional[Dict[str, Dict[str, Any]]] = Field(default_factory=dict)
    specific_frequencies: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    frequency_ranges: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    notch_filters: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    burst_settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    timer_duration: Optional[int] = None

class AudioSettingsUpdate(BaseModel):
    name: Optional[str] = None
    noise_types: Optional[Dict[str, Dict[str, Any]]] = None
    specific_frequencies: Optional[List[Dict[str, Any]]] = None
    frequency_ranges: Optional[List[Dict[str, Any]]] = None
    notch_filters: Optional[List[Dict[str, Any]]] = None
    burst_settings: Optional[Dict[str, Any]] = None
    timer_duration: Optional[int] = None

class TinnitusFrequency(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ear: str  # "left" or "right" or "both"
    frequency: float  # in Hz
    volume: float  # 0.0 to 1.0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TinnitusFrequencyCreate(BaseModel):
    ear: str
    frequency: float
    volume: float
    notes: Optional[str] = None

# Legacy status check models (keeping existing functionality)
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str


# Audio Settings Routes
@api_router.post("/audio-settings", response_model=AudioSettings)
async def create_audio_settings(settings: AudioSettingsCreate):
    """Create new audio settings/playlist"""
    settings_dict = settings.dict()
    settings_obj = AudioSettings(**settings_dict)
    result = await db.audio_settings.insert_one(settings_obj.dict())
    return settings_obj

@api_router.get("/audio-settings", response_model=List[AudioSettings])
async def get_all_audio_settings():
    """Get all saved audio settings/playlists"""
    settings = await db.audio_settings.find().sort("created_at", -1).to_list(100)
    return [AudioSettings(**setting) for setting in settings]

@api_router.get("/audio-settings/{settings_id}", response_model=AudioSettings)
async def get_audio_settings(settings_id: str):
    """Get specific audio settings by ID"""
    settings = await db.audio_settings.find_one({"id": settings_id})
    if not settings:
        raise HTTPException(status_code=404, detail="Audio settings not found")
    return AudioSettings(**settings)

@api_router.put("/audio-settings/{settings_id}", response_model=AudioSettings)
async def update_audio_settings(settings_id: str, updates: AudioSettingsUpdate):
    """Update existing audio settings"""
    update_dict = {k: v for k, v in updates.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.audio_settings.update_one(
        {"id": settings_id}, 
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Audio settings not found")
    
    updated_settings = await db.audio_settings.find_one({"id": settings_id})
    return AudioSettings(**updated_settings)

@api_router.delete("/audio-settings/{settings_id}")
async def delete_audio_settings(settings_id: str):
    """Delete audio settings/playlist"""
    result = await db.audio_settings.delete_one({"id": settings_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Audio settings not found")
    return {"message": "Audio settings deleted successfully"}

# Tinnitus Frequency Routes
@api_router.post("/tinnitus-frequency", response_model=TinnitusFrequency)
async def save_tinnitus_frequency(frequency_data: TinnitusFrequencyCreate):
    """Save detected tinnitus frequency"""
    frequency_dict = frequency_data.dict()
    frequency_obj = TinnitusFrequency(**frequency_dict)
    result = await db.tinnitus_frequencies.insert_one(frequency_obj.dict())
    return frequency_obj

@api_router.get("/tinnitus-frequency", response_model=List[TinnitusFrequency])
async def get_tinnitus_frequencies():
    """Get all saved tinnitus frequencies"""
    frequencies = await db.tinnitus_frequencies.find().sort("created_at", -1).to_list(100)
    return [TinnitusFrequency(**freq) for freq in frequencies]

@api_router.delete("/tinnitus-frequency/{frequency_id}")
async def delete_tinnitus_frequency(frequency_id: str):
    """Delete tinnitus frequency record"""
    result = await db.tinnitus_frequencies.delete_one({"id": frequency_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tinnitus frequency record not found")
    return {"message": "Tinnitus frequency record deleted successfully"}

# Legacy routes (keeping existing functionality)
@api_router.get("/")
async def root():
    return {"message": "Tinnitus Therapy API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()