from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path
from routers import (
    analysis,
    auth,
    report,
    portfolio,
    alerts,
    history,
    saved_portfolio,
    live_price,
)
from database import users_collection, analyses_collection, portfolios_collection
from services.nse_validator import refresh_nse_list_from_website

_HERE = Path(__file__).resolve().parent
_REPO_ROOT = _HERE.parent
load_dotenv(dotenv_path=_HERE / ".env", override=False)
load_dotenv(dotenv_path=_REPO_ROOT / ".env", override=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create unique index on email for fast lookups and duplicate prevention
    await users_collection.create_index("email", unique=True)
    # Index on userId for efficient history queries
    await analyses_collection.create_index("userId")
    await analyses_collection.create_index([("userId", 1), ("createdAt", -1)])
    # One portfolio document per user
    await portfolios_collection.create_index("userId", unique=True)
    # Keep NSE symbols fresh for newly listed / renamed companies.
    refresh_nse_list_from_website()
    yield


app = FastAPI(title="AuditGPT API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router,           prefix="/api")
app.include_router(auth.router,               prefix="/auth")
app.include_router(report.router,             prefix="/api")
app.include_router(portfolio.router,          prefix="/api")
app.include_router(alerts.router,             prefix="/api")
app.include_router(history.router,            prefix="/api")
app.include_router(saved_portfolio.router,    prefix="/api")
app.include_router(live_price.router,         prefix="/api")


@app.get("/")
def root():
    return {"status": "AuditGPT API running", "version": "1.0.0"}
