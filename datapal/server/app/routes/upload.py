from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy import insert, text, inspect
from ..database import engine
from ..utils.dynamic_table import create_dynamic_table
import pandas as pd
import re

router = APIRouter(prefix="/upload", tags=["Upload"])

def clean_column_name(col: str) -> str:
    col = col.strip()
    col = re.sub(r'[^0-9a-zA-Z_]', '_', col)
    col = re.sub(r'_+', '_', col)
    col = col.strip('_')
    return col.lower()   # 👈 this ensures columns are lowercase


@router.post("/")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # 📥 Read CSV
    try:
        df = pd.read_csv(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {e}")

    # 🧼 Clean up column names
    original_cols = df.columns.tolist()
    cleaned_cols = [clean_column_name(c) for c in original_cols]
    df.columns = cleaned_cols

    table_name = "uploaded_dataset2"  # static for MVP
    inspector = inspect(engine)

    # 🗑️ Drop table if it exists (overwrite behavior)
    if inspector.has_table(table_name):
        try:
            with engine.begin() as conn:
                conn.execute(text(f'DROP TABLE "{table_name}"'))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to drop existing table: {e}")

    # 🏗️ Create new table and insert rows
    try:
        table = create_dynamic_table(table_name, cleaned_cols, engine)
        rows = df.to_dict(orient="records")
        with engine.begin() as conn:
            conn.execute(insert(table), rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save data to database: {e}")

    return {
        "message": f"Uploaded {len(rows)} rows to table '{table_name}' (previous dataset overwritten if existed)",
        "original_columns": original_cols,
        "cleaned_columns": cleaned_cols
    }
