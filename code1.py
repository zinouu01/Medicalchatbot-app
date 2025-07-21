import os
import sys
import numpy as np
import pandas as pd
from pymongo import MongoClient
from datetime import datetime
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, regexp_replace, lower, trim, length
from pyspark.sql.types import StringType, StructType, StructField

# Set up the environment
os.environ["PYSPARK_PYTHON"] = sys.executable
os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable

# Initialize Spark session
spark = SparkSession.builder \
    .appName("RAG_Chatbot") \
    .master("local[*]") \
    .config("spark.executor.memory", "4g") \
    .config("spark.driver.memory", "4g") \
    .getOrCreate()

# MongoDB settings
MONGO_CONNECTION_STRING = "mongodb://localhost:27017/"
MONGO_DB_NAME = "rag_medical_assistant_2"
MONGO_COLLECTION_MEDQUAD = "medquad_dataset"
MONGO_COLLECTION_GENERAL = "general_dataset"
MONGO_COLLECTION_EMBEDDINGS = "embeddings"
mongo_client = MongoClient(MONGO_CONNECTION_STRING)
db = mongo_client[MONGO_DB_NAME]

# Enhanced text cleaning using Spark SQL functions
def clean_text_spark(df, column_name):
    return df.withColumn(column_name, 
                         lower(
                             trim(
                                 regexp_replace(col(column_name), r'[^a-zA-Z0-9\s]', ' ')
                             )
                         )
                        ) \
             .withColumn(column_name, 
                         regexp_replace(col(column_name), r'\s+', ' ')
                        )

# Load and process data
def load_and_process_data():
    # Load medical dataset from MongoDB
    try:
        medquad_data = list(db[MONGO_COLLECTION_MEDQUAD].find({}, {"document": 1, "answer": 1, "category": 1, "_id": 0}))
        medquad = spark.createDataFrame(medquad_data)
    except Exception as e:
        print(f"Error loading medical dataset from MongoDB: {str(e)}")
        medquad = spark.createDataFrame([], schema=StructType([StructField("document", StringType(), True),
                                                                StructField("answer", StringType(), True),
                                                                StructField("category", StringType(), True)]))

    # Load general dataset from MongoDB
    try:
        general_data = list(db[MONGO_COLLECTION_GENERAL].find({}, {"document": 1, "answer": 1, "category": 1, "_id": 0}))
        general = spark.createDataFrame(general_data)
    except Exception as e:
        print(f"Error loading general dataset from MongoDB: {str(e)}")
        general = spark.createDataFrame([], schema=StructType([StructField("document", StringType(), True),
                                                              StructField("answer", StringType(), True),
                                                              StructField("category", StringType(), True)]))

    # Combine and clean the data
    combined = medquad.select("document", "answer", "category") \
        .union(general.select("document", "answer", "category")) \
        .filter(col("document").isNotNull() & col("answer").isNotNull() & (length(col("document")) > 0))

    combined = clean_text_spark(combined, "document")

    # Chunk longer documents for better retrieval
    combined.cache()
    return combined

# Create a mock embedding function (as an alternative to the external API)
def embed_document(doc, idx=None, total=None):
    try:
        # Mock embedding: Just creating a random 768-dimensional embedding
        emb = np.random.rand(768)  # Using a random 768-dimensional embedding
        return emb
    except Exception as e:
        print(f"\nError embedding document: {str(e)}...")
        return np.zeros(768)

# Save embeddings to MongoDB
def save_embeddings(knowledge):
    print(f"\nSaving {len(knowledge)} embeddings to MongoDB...")
    
    # Drop the existing embeddings collection
    db[MONGO_COLLECTION_EMBEDDINGS].drop()
    
    # Convert numpy arrays to lists for MongoDB storage
    embedding_records = []
    for _, row in knowledge.iterrows():
        record = {
            "document": row["document"],
            "answer": row["answer"],
            "category": row["category"],
            "embedding": row["embedding"].tolist(),  # Convert numpy array to list
            "timestamp": datetime.now()
        }
        embedding_records.append(record)
    
    # Insert all embedding records
    if embedding_records:
        db[MONGO_COLLECTION_EMBEDDINGS].insert_many(embedding_records)
    
    print("Save complete!")

# Prepare knowledge and embeddings
def prepare_knowledge():
    print("Preparing knowledge base...")
    data = load_and_process_data().toPandas()
    total_docs = len(data)
    print(f"Found {total_docs} documents to process")
    embeddings = []

    for i, doc in enumerate(data["document"]):
        emb = embed_document(doc, idx=i, total=total_docs)
        embeddings.append(emb)
    
    print("\nEmbedding complete!")
    
    data["embedding"] = embeddings
    save_embeddings(data)
    return data

# Run the embedding preparation
if __name__ == "__main__":
    prepare_knowledge()
