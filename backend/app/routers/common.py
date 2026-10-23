from app.schemas import ErrorResponse

ERR_404 = {404: {"model": ErrorResponse, "description": "Student, assessment, plan, or exercise not found"}}
ERR_422 = {422: {"model": ErrorResponse, "description": "Schema validation error"}}
ERR_500 = {500: {"model": ErrorResponse, "description": "Unexpected server error"}}
GENERATOR_HEADER = "X-NeuroTrace-Generator"
