# Vercel Serverless Function entrypoint for FastAPI
import sys
import os

sys.path.insert(0, os.path.abspath("."))
from backend.app.main import app

