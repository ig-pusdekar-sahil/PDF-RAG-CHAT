from fastapi import FastAPI,UploadFile,HTTPException
from pathlib import Path
from rag_pipeline import RAG
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    os.getenv("FRONTEND_URL") or "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"]
)

rag = RAG()

PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"

MAX_FILE_SIZE = 10 * 1024 * 1024

class QueryRequest(BaseModel):
    question:str


@app.get("/")
async def root():
    return {"Message":"Server is running..."}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "docs_indexed": rag.collection.count()}

@app.post("/api/documents/upload")
async def upload_document(file:UploadFile):
    filename = Path(file.filename or "").name
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400,detail="Only Pdf files are supported!")

    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File size exceeds the maximum limit of {MAX_FILE_SIZE // (1024 * 1024)} MB."
        )
    
    DATA_DIR.mkdir(exist_ok=True)

    for existing_file in DATA_DIR.glob("*"):
        if existing_file.is_file():
            existing_file.unlink()

    saved_file_path = DATA_DIR / filename
    saved_file_path.write_bytes(contents)
    
    print(saved_file_path)
    try:
        pages , chunks_added = rag.ingest_pdf(saved_file_path)
    except Exception as exc:
        raise HTTPException(status_code=500,detail=f"Failed to ingest PDF: {exc}")
    
    return {
        "filename":filename,
        "pages":pages,
        "chunks_added":chunks_added
    }
    

@app.post("/api/query")
async def query(body:QueryRequest):   
    try:
        return rag.answer(body.question)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to answer query: {exc}")
    
    