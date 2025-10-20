from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text, inspect
from ..database import engine
import cohere
import os
import pandas as pd
import re

router = APIRouter(prefix="/query", tags=["Query"])

class QueryRequest(BaseModel):
    user_query: str

# Initialize Cohere client
co = cohere.Client(os.getenv("COHERE_API_KEY"))

@router.post("/")
async def run_query(request: QueryRequest):
    table_name = "uploaded_dataset2"  # or dynamically track this later

    # Get table structure
    try:
        insp = inspect(engine)
        columns = insp.get_columns(table_name)
        column_names = [col["name"] for col in columns]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inspect table: {e}")

    # Preview the data (for LLM context)
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT 5'))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read table: {e}")

    schema_context = f"Table name: {table_name}\nColumns: {', '.join(column_names)}\nSample rows:\n{df.to_string(index=False)}"

    # Generate SQL via Cohere
    try:
        response = co.chat(
            model="command-a-03-2025",
            message=f"""
You are an expert SQL query generator for a PostgreSQL database.

Based on the following table structure and data sample, write a valid SQL query for PostgreSQL that answers the question.
Do not include markdown, code blocks, or explanations — just the SQL statement.

{schema_context}

User question: "{request.user_query}"
            """,
            temperature=0,
        )
        sql_query = response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cohere API error: {e}")

    # Attempt to auto-cast numeric-looking columns
    try:
        for col in column_names:
            sample_vals = df[col].dropna().astype(str).tolist()[:5]
            if sample_vals and all(v.replace('.', '', 1).isdigit() for v in sample_vals):
                sql_query = re.sub(
                    fr'\b{col}\b',
                    f'{col}::float',
                    sql_query,
                    flags=re.IGNORECASE
                )

        with engine.connect() as conn:
            result = conn.execute(text(sql_query))
            rows = [dict(r) for r in result.mappings()]
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "SQL execution failed",
                "generated_sql": sql_query,
                "db_error": str(e),
                "available_columns": column_names,
                "data_sample": df.to_dict(orient="records")
            }
        )

    return {
        "generated_sql": sql_query,
        "results": rows
    }
