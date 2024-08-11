FROM python:3.11-alpine

RUN apk update && \
    apk add --no-cache bash tzdata

COPY vinylkeeper_back /vinylkeeper_back

WORKDIR /vinylkeeper_back

RUN python -m venv venv && \
    venv/bin/pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD /bin/bash -c "venv/bin/alembic upgrade head && venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000"
