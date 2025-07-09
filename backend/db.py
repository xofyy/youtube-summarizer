import os
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Depends
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

def get_db():
    return db 