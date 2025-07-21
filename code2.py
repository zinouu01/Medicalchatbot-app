


# <=== Your imports (same) ===>
from flask import Flask, request, jsonify
from datetime import datetime
import traceback
import os
import sys
import numpy as np
import pandas as pd
import google.generativeai as genai
from tqdm import tqdm
from pymongo import MongoClient
import json

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, concat_ws, lit, length, lower, regexp_replace, explode, split, trim
from pyspark.sql.types import StringType, ArrayType, StructType, StructField
import pyspark.sql.functions as F
from flask_cors import CORS
from pyngrok import ngrok

# NEW IMPORT for speed
import faiss  # Facebook AI Similarity Search

# <=== Your settings (ngrok, genai, spark, mongo settings) ===>
ngrok.set_auth_token("2vwxU9opsA8ardGP6v2XgiTA4zq_2DMvnBvUe17M9372LFtiy")
genai.configure(api_key="AIzaSyAVEHQFTdjHMQgabJDoMg6olBlH1ok_2Z0")

os.environ["PYSPARK_PYTHON"] = sys.executable
os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable

spark = SparkSession.builder \
    .appName("RAG_Chatbot") \
    .master("local[*]") \
    .config("spark.executor.memory", "4g") \
    .config("spark.driver.memory", "4g") \
    .config("spark.sql.adaptive.enabled", "true") \
    .config("spark.sql.shuffle.partitions", "8") \
    .getOrCreate()

mongo_client = MongoClient("mongodb://localhost:27017/")
db = mongo_client["rag_medical_assistant_2"]

MONGO_COLLECTION_EMBEDDINGS = "embeddings"
MONGO_COLLECTION_CATEGORIES = "categories"

gen_model = genai.GenerativeModel("gemini-2.0-flash")

# <=== Cleaning / chunking / embedding / saving functions (same) ===>

# Cosine Similarity Helper (still here but FAISS will replace it in practice)
def cosine_similarity(a, b):
    dot = np.dot(a, b)
    return dot / (np.linalg.norm(a) * np.linalg.norm(b)) if np.linalg.norm(a) and np.linalg.norm(b) else 0

# Vertical Memory Class (same)
class VerticalMemory:
    def __init__(self, capacity=100):
        self.capacity = capacity
        self.conversations = []
        self.category_memory = {}
    
    def add(self, question, answer, categories=None):
        self.conversations.append((question, answer, categories))
        if len(self.conversations) > self.capacity:
            self.conversations.pop(0)
        if categories:
            for category in categories:
                if category not in self.category_memory:
                    self.category_memory[category] = []
                self.category_memory[category].append((question, answer))
                if len(self.category_memory[category]) > self.capacity // 2:
                    self.category_memory[category].pop(0)
    
    def get_relevant_history(self, query=None, categories=None, limit=5):
        result = []
        result.extend([(q, a) for q, a, _ in self.conversations[-3:]])
        if categories:
            for category in categories:
                if category in self.category_memory:
                    category_convos = [(q, a) for q, a in self.category_memory[category][-2:]]
                    result.extend(category_convos)
        return result[-limit:]
    
    def get_full_history(self):
        history_entries = []
        for question, answer, categories in self.conversations:
            entry = {
                "question": question,
                "answer": answer,
                "categories": categories if categories else [],
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            history_entries.append(entry)
        return history_entries

# Load embeddings once and prepare FAISS index
def load_embeddings_and_faiss():
    print("Loading embeddings from MongoDB...")
    embedding_records = list(db[MONGO_COLLECTION_EMBEDDINGS].find({}))
    df = pd.DataFrame(embedding_records)
    if not df.empty:
        df["embedding"] = df["embedding"].apply(np.array)
        if "_id" in df.columns:
            df = df.drop(columns=["_id"])
    print(f"Loaded {len(df)} documents.")
    
    # FAISS: Build index
    dimension = len(df["embedding"].iloc[0])  # Should be 768
    faiss_index = faiss.IndexFlatL2(dimension)
    
    # Convert all embeddings to a matrix
    embedding_matrix = np.vstack(df["embedding"].values)
    
    faiss_index.add(embedding_matrix)
    print(f"FAISS index built with {faiss_index.ntotal} vectors.")
    
    return df, faiss_index

# Load everything on startup
knowledge, faiss_index = load_embeddings_and_faiss()

# Global memory
global_memory = VerticalMemory(capacity=100)

# RAG with FAISS
def rag_answer(query, memory):
    try:
        print(f"Finding relevant information for query: {query}")
        query_emb = np.array(genai.embed_content(
            model="models/embedding-001",
            content=query,
            task_type="retrieval_query"
        )["embedding"]).astype(np.float32)
        
        # Search top 3 similar docs FAST
        D, I = faiss_index.search(query_emb.reshape(1, -1), 3)
        top_docs = knowledge.iloc[I[0]]
        
        categories = top_docs["category"].unique().tolist()
        relevant_history = memory.get_relevant_history(query=query, categories=categories)
        memory_text = "\n".join([f"Q: {m[0]}\nA: {m[1]}" for m in relevant_history])

        context = "\n".join([f"Document {i+1}: {row['document']}\nAnswer: {row['answer']}" for i, row in top_docs.iterrows()])
        
        prompt = f"""
You are a medical assistant. Use the context below to answer the question professionally.

Previous Chat:
{memory_text}

Knowledge Context:
{context}

Question: {query}

Answer:"""
        print("Generating response...")
        result = gen_model.generate_content(prompt)
        answer = result.text.strip()
        memory.add(query, answer, categories)
        
        return answer, top_docs["document"].tolist(), categories

    except Exception as e:
        traceback.print_exc()
        return f"Error: {str(e)}", [], []

# Flask App
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_input = data.get("question", "")
        if not user_input.strip():
            return jsonify({"error": "Empty question"}), 400
        answer, references, categories = rag_answer(user_input, global_memory)
        return jsonify({
            "response": answer,
            "references": references,
            "categories": categories,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route("/history", methods=["GET"])
def history():
    try:
        category = request.args.get("category", None)
        full_history = global_memory.get_full_history()
        if category:
            filtered_history = [entry for entry in full_history if entry["categories"] and category in entry["categories"]]
            return jsonify({"conversation": filtered_history, "filtered_by": category})
        return jsonify({
            "conversation": full_history[::-1],
            "total_entries": len(full_history),
            "categories": list(global_memory.category_memory.keys())
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Start Flask normally
    port = 5000

    # Expose the port with ngrok
    public_url = ngrok.connect(port).public_url
    print(f" * ngrok tunnel running at: {public_url}")

    app.run(port=port)
