"""Standard error shape (contract section 9):
{"error": {"code": "...", "message": "...", "details": {}}}"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("neurotrace")


class APIError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


def error_response(status_code: int, code: str, message: str, details: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "details": details or {}}},
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def _api_error(_: Request, exc: APIError):
        return error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            code, default = "NOT_FOUND", "The requested resource was not found."
        elif exc.status_code < 500:
            code, default = "VALIDATION_ERROR", "The request could not be processed."
        else:
            code, default = "INTERNAL_ERROR", "Unexpected server error."
        message = exc.detail if isinstance(exc.detail, str) and exc.detail != "Not Found" else default
        return error_response(exc.status_code, code, message)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        errors = []
        for err in exc.errors():
            loc = [str(part) for part in err.get("loc", ())]
            field = ".".join(loc[1:] if loc and loc[0] in {"body", "query", "path", "header", "cookie"} else loc)
            errors.append({"field": field or None, "location": loc, "message": err.get("msg"), "type": err.get("type")})
        summary = "; ".join(f"{e['field'] or 'request body'}: {e['message']}" for e in errors[:3])
        return error_response(422, "VALIDATION_ERROR", f"Invalid request. {summary}", {"errors": errors})

    @app.exception_handler(SQLAlchemyError)
    async def _db_error(_: Request, exc: SQLAlchemyError):
        logger.exception("Database error")
        return error_response(500, "DATABASE_ERROR", "A database error occurred. Please try again.")

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        logger.exception("Unhandled error")
        return error_response(500, "INTERNAL_ERROR", "An unexpected server error occurred.")
