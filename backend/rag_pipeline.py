import os
from pathlib import Path
from langchain_community.document_loaders.pdf import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from fastembed import TextEmbedding
import chromadb
import uuid
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

PROJECT_DIR = Path(__file__).resolve().parent
VECTOR_STORE_DIR = PROJECT_DIR / "vector_store"

def load_all_pdfs(pdf_path):           
    pdf_loader = PyMuPDFLoader(pdf_path)
    document = pdf_loader.load()
            
    print(f"Total pages : {len(document)}")
            
    return document


def split_docs(document,chunk_size=1000,chunk_overlap=200):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    
    chunks = splitter.split_documents(document)
    
    return chunks



class RAG:
    def __init__(self):
        print("Loading Embedding Model...")
        self.embedding_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        VECTOR_STORE_DIR.mkdir(exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(VECTOR_STORE_DIR))
        self.collection = self.client.get_or_create_collection(
            name="rag_app",
            metadata={
                "hnsw:space": "cosine"
            }
        )
        print("Vector store initiallized!")
        print("Docs in collection:", self.collection.count())
        
        self.llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0.1,
            max_tokens=1024,
        )

    def reset_collection(self):
        existing_ids = self.collection.get()["ids"]
        if existing_ids:
            self.collection.delete(ids=existing_ids)
            print(f"Cleared {len(existing_ids)} old items from ChromaDB.")

    def ingest_pdf(self,folder_path):
        self.reset_collection()
        document = load_all_pdfs(folder_path)
        chunks = split_docs(document)
                
        if not chunks:
            return len(document),0
        
        texts = [doc.page_content for doc in chunks]
        embeddings = list(self.embedding_model.embed(texts))
        
        if len(chunks) != len(embeddings):
            raise ValueError("num of documents does not match to num of embeddings!")
        
        ids = []
        all_metadata = []
        
        for i , (doc) in enumerate(chunks):
            doc_id = f"doc_{uuid.uuid4()}"
            ids.append(doc_id)
            
            metadata = dict(doc.metadata)
            metadata["doc_index"] = i
            metadata["content_length"] = len(doc.page_content)
            all_metadata.append(metadata)
        
        self.collection.add(
            ids=ids,
            metadatas=all_metadata,
            documents=texts,
            embeddings=[embedding.tolist() for embedding in embeddings]
        )
        
        return len(document),len(chunks)


    def retrieve(self,query,top_k=10,min_threshold=0.05):
        
        query_embedding = list(self.embedding_model.embed([query]))[0] 
        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k
        )
        retrieved_documents = []
        ids = results["ids"][0]
        metadatas = results["metadatas"][0]
        documents = results["documents"][0]
        distances = results["distances"][0]
        
        for i ,(doc_id,metadata,document,distance) in enumerate(zip(ids,metadatas,documents,distances)):
            similarity_score = 1 - distance
            if similarity_score > min_threshold:
                retrieved_documents.append({
                    "id":doc_id,
                    "metadata":metadata,
                    "document":document,
                    "distance":distance
                })
                               
        return retrieved_documents


    def answer(self,question):
        if self.collection.count() == 0:
            return {
                "answer": "No documents indexed yet. Upload a PDF first.",
                "sources": [],
            }
        
        retrieved_documents = self.retrieve(question)
        if  len(retrieved_documents) == 0:
            return {
                "answer": (
                    "I could not find anything related to that in the uploaded "
                    "documents. Please ask about the content of your uploaded PDFs."
                ),
                "sources": [],
            }

        context = "\n".join(doc["document"] for doc in retrieved_documents)
        prompt = (
    "You are a helpful assistant that answers questions ONLY using the "
    "provided context from the user's uploaded documents.\n\n"
    "Formatting Rules:\n"
    "- Use clean Markdown with headers, bullet points, and bold text.\n"
    "- If returning tabular data, use standard GitHub-Flavored Markdown tables with proper newlines after each row.\n"
    "- Do not collapse or join table rows into a single line.\n"
    "- If the context does not contain the information needed to answer, "
    "reply exactly: 'I could not find an answer to that in the uploaded documents.' Never use outside knowledge.\n\n"
    f"Context:\n{context}"
)
        
        messages = [
            ("system",prompt),
            ("human",question),
        ]

        response  = self.llm.invoke(messages)

        top_source = None
        if retrieved_documents:
            top_doc = retrieved_documents[0]
            meta = top_doc.get("metadata", {})
            file_path = meta.get("source", "")
            
            top_source = {
                "filename": Path(file_path).name if file_path else "Document",
                "page": meta.get("page") + 1
            }

        print({
                "answer": (
                    response.content
                ),
                "source": top_source,
            })
        
        return {
                "answer": (
                    response.content
                ),
                "source": top_source,
            }