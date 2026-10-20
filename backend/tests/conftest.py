import os


for key in ("DATABASE_URL", "GROQ_API_KEY", "AI_API_KEY"):
    os.environ[key] = ""
