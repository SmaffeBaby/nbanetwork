"""Restricted archive reader with browser TLS and a persistent last-good cache."""
import hashlib
import os
from pathlib import Path
import re
import threading
import time

from curl_cffi import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response

router = APIRouter()
ROOT = "https://www.basketball-reference.com"
ALLOWED_PATH = re.compile(r"/(?:leagues/NBA_\d{4}|teams/[A-Z]{2,4}/\d{4}|(?:coaches|executives)/[a-z0-9]{3,24}|awards/[a-z_]+)\.html\Z")
CACHE_DIR = Path(os.environ.get("BASKETBALL_REFERENCE_CACHE_DIR", "/var/cache/basketball-reference"))
FETCH_LOCK = threading.Lock()
LAST_REQUEST = 0.0
TTL = 3600


def read_page(path: str) -> str:
    global LAST_REQUEST
    if not ALLOWED_PATH.fullmatch(path):
        raise HTTPException(400, "Unsupported archive path")
    filename = CACHE_DIR / (hashlib.sha256(path.encode()).hexdigest() + ".html")
    with FETCH_LOCK:
        cached = filename.read_text() if filename.exists() else None
        if cached is not None and time.time() - filename.stat().st_mtime < TTL:
            return cached
        try:
            time.sleep(max(0, 3.1 - (time.monotonic() - LAST_REQUEST)))
            LAST_REQUEST = time.monotonic()
            response = requests.get(ROOT + path, impersonate="chrome", timeout=18, allow_redirects=False)
            response.raise_for_status()
            html = response.text
            if len(response.content) > 8 * 1024 * 1024 or "<h1" not in html or "<html" not in html.lower():
                raise ValueError("Unexpected archive response")
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            temporary = filename.with_suffix(".tmp")
            temporary.write_text(html)
            temporary.replace(filename)
            return html
        except Exception as error:
            if cached is not None:
                return cached
            raise HTTPException(503, "Archive temporarily unavailable") from error


@router.get("/internal/basketball-reference", response_class=HTMLResponse, include_in_schema=False)
def archive_page(path: str):
    return HTMLResponse(read_page(path), headers={"Cache-Control": "no-store"})


@router.get("/internal/basketball-reference-image", include_in_schema=False)
def archive_image(path: str):
    if not re.fullmatch(r"/req/\d+/images/headshots/[a-z0-9]+\.(png|jpg|jpeg)", path):
        raise HTTPException(400, "Unsupported portrait path")
    try:
        response = requests.get(ROOT + path, impersonate="chrome", timeout=18, allow_redirects=False)
        if response.status_code in (404, 410):
            raise HTTPException(404, "Portrait not found")
        response.raise_for_status()
        content = response.content
        mime = "image/png" if path.endswith(".png") else "image/jpeg"
        signature = b"\x89PNG\r\n\x1a\n" if mime == "image/png" else b"\xff\xd8\xff"
        if len(content) > 2 * 1024 * 1024 or not content.startswith(signature):
            raise ValueError("Invalid portrait")
        return Response(content, media_type=mime)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(503, "Portrait temporarily unavailable") from error
