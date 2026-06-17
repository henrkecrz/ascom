from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import spacy
from sentence_transformers import SentenceTransformer
import pdfplumber
import io
import uvicorn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Plano de Comunicacao - Python NLP Service")

# Load models at startup to avoid delay on first request
try:
    logger.info("Loading spaCy model pt_core_news_sm...")
    nlp = spacy.load("pt_core_news_sm")
except OSError:
    logger.error("spaCy model 'pt_core_news_sm' not found. Please run: python -m spacy download pt_core_news_sm")
    nlp = None

try:
    logger.info("Loading Sentence-Transformers model all-MiniLM-L6-v2...")
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
except Exception as e:
    logger.error(f"Error loading embedding model: {e}")
    embedding_model = None

class TextInput(BaseModel):
    text: str

@app.get("/ping")
def ping():
    return {"status": "ok", "models": {"spacy": nlp is not None, "sentence_transformers": embedding_model is not None}}

@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        content = await file.read()
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
            
            return {"filename": file.filename, "text": text}
    except Exception as e:
        logger.error(f"Error extracting PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/entities")
def extract_entities(input_data: TextInput):
    if not nlp:
        raise HTTPException(status_code=500, detail="spaCy model not loaded")
    
    # Process text in chunks to avoid memory issues with huge texts
    # spaCy default limit is 1.000.000 characters. We'll enforce a smaller limit just in case.
    text = input_data.text[:500000]
    
    doc = nlp(text)
    entities = []
    
    # spaCy entity labels in Portuguese:
    # PER: Person
    # LOC: Location
    # ORG: Organization
    # MISC: Miscellaneous
    
    for ent in doc.ents:
        entities.append({
            "text": ent.text,
            "label": ent.label_
        })
        
    return {"entities": entities}

@app.post("/embeddings")
def generate_embeddings(input_data: TextInput):
    if not embedding_model:
        raise HTTPException(status_code=500, detail="Embedding model not loaded")
    
    text = input_data.text
    truncated_text = text[:10000] 
    
    embedding = embedding_model.encode(truncated_text).tolist()
    return {"embedding": embedding}

class BatchTextInput(BaseModel):
    texts: list[str]

@app.post("/embeddings_batch")
def generate_embeddings_batch(input_data: BatchTextInput):
    if not embedding_model:
        raise HTTPException(status_code=500, detail="Embedding model not loaded")
    
    truncated_texts = [text[:10000] for text in input_data.texts]
    embeddings = embedding_model.encode(truncated_texts).tolist()
    return {"embeddings": embeddings}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
