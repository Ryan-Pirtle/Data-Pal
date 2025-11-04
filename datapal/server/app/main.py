from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import cohere_nlp, upload, query

app = FastAPI()

# ✅ Allow both localhost origins for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(cohere_nlp.router)
app.include_router(upload.router)
app.include_router(query.router)

@app.get("/")
def root():
    return {"message": "Welcome to Data Pal Backend"}
