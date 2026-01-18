"""
LinguAI Backend API
FastAPI application for acoustic analysis powered by Parselmouth.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, analyze, textgrid

app = FastAPI(
    title="LinguAI API",
    description="AI-native acoustic analysis platform API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "app://.",  # Electron
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, prefix="/api/v1", tags=["Analysis"])
app.include_router(textgrid.router, prefix="/api/v1", tags=["TextGrid"])


@app.get("/")
async def root():
    return {
        "name": "LinguAI API",
        "version": "0.1.0",
        "status": "running",
    }
