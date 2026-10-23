"""NeuroTrace API entrypoint.  Run:  uvicorn app.main:app --reload --port 8000"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import SERVICE_NAME, __version__
from app.config import get_settings
from app.database import SessionLocal, init_db
from app.errors import register_exception_handlers
from app.routers import admin, assessments, exercises, health, students, therapy_plans
from app.routers.common import GENERATOR_HEADER
from app.services.seed_service import seed_demo

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("neurotrace")

DESCRIPTION = """
Backend for **NeuroTrace** - AI-assisted handwriting observations and therapy support.

Follows *NeuroTrace Shared API Contract v1.0*.

> NeuroTrace provides AI-assisted handwriting observations and therapy-support recommendations.
> It is not a medical diagnostic tool and does not replace professional therapist judgment.
""".strip()


def create_app() -> FastAPI:
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        init_db()  # automatic table creation
        if settings.seed_on_startup:
            with SessionLocal() as db:
                logger.info("SEED_ON_STARTUP: %s", seed_demo(db)["status"])
        logger.info("NeuroTrace API ready (AI %s, demo analysis %s)",
                    "configured" if settings.ai_configured else "off -> deterministic fallbacks",
                    "ON" if settings.demo_analysis else "off")
        yield

    app = FastAPI(
        title="NeuroTrace API", version=__version__, description=DESCRIPTION, lifespan=lifespan,
        openapi_tags=[
            {"name": "Health"}, {"name": "Students"}, {"name": "Assessments"}, {"name": "Therapy plans"},
            {"name": "Exercises"}, {"name": "Demo / admin", "description": "Non-contract helper routes"},
        ],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if settings.cors_allow_localhost else None,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[GENERATOR_HEADER],
    )
    register_exception_handlers(app)
    for module in (health, students, assessments, therapy_plans, exercises, admin):
        app.include_router(module.router)

    @app.get("/", include_in_schema=False)
    def root():
        return {"service": SERVICE_NAME, "version": __version__, "docs": "/docs", "health": "/health"}

    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
    return app


app = create_app()
