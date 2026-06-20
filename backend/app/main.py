from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config.settings import settings

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(',') if origin.strip()],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/')
def root():
    return {
        'app': settings.APP_NAME,
        'version': settings.APP_VERSION,
        'status': 'ok',
        'timezone': settings.DEFAULT_TIMEZONE,
        'date_format': settings.DEFAULT_DATE_FORMAT,
    }

app.include_router(api_router, prefix='/api/v1')
