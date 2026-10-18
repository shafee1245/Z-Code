from celery import Celery

from src.core.config import settings

celery_app = Celery("qr_studio", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(task_serializer="json", accept_content=["json"], result_serializer="json", timezone="UTC")


@celery_app.task(name="qr_studio.health_check")
def health_check() -> str:
    return "worker-ready"
