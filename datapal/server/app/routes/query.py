from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text, inspect
from ..database import engine
import cohere
import os
import pandas as pd
import re
from bokeh.plotting import figure
from bokeh.embed import json_item

def is_number(s: str) -> bool:
    try:
        float(s)
        return True
    except:
        return False



router = APIRouter(prefix="/query", tags=["Query"])

class QueryRequest(BaseModel):
    user_query: str
    plot_mode: bool = False

co = cohere.Client(os.getenv("COHERE_API_KEY"))

@router.post("/")
async def run_query(request: QueryRequest):
    table_name = "uploaded_dataset2"

    if request.plot_mode:
        instruction = f"""
You are generating Python code ONLY.

STRICT RULES:
- Do NOT use ``` or ```python
- Do NOT write imports
- Do NOT use show()
- Do NOT explain anything
- Do NOT print anything
- ONLY produce raw Python code
- Never call pd.read_sql_query with engine directly
- Always use: with engine.connect() as conn
- NEVER use plot_height or plot_width
- Use ONLY: height and width
- The figure MUST include tools="pan,wheel_zoom,box_zoom,reset,save"
- NEVER use y_axis_location except "left" or "right"
- NEVER use constants for top or y, must be a column or list
- Ensure column names match schema EXACTLY
# Data cleaning rule
For any dataframe read from CSV, convert all numeric-looking columns using:
df[col] = pd.to_numeric(df[col], errors="coerce")

IMPORTANT SQL RULE:
If the SQL involves numeric comparison, aggregation, or ordering on a column that came from CSV, 
you MUST cast it in the SQL using:
(column_name)::float
Example:
WHERE height_inches::float > 60


MANDATORY DATA CLEANING:
df = df.dropna()
df = df.reset_index(drop=True)

FOR NUMERIC AXES:
- ALWAYS cast numeric columns: df["col"] = df["col"].astype(float)
- NEVER plot object dtype on a numeric axis
- If x is numeric: DO NOT use x_range

FOR CATEGORICAL AXIS:
- x_range MUST be: list(df["col"].astype(str))
- ALWAYS use ColumnDataSource(df)

IF SQL RETURNS ONLY 1 COLUMN:
- Create df["x"] = range(len(df))
- Cast the single column to float
- Use df["x"] as x

ALWAYS USE ONE OF THESE TWO TEMPLATES:

NUMERIC TEMPLATE:

sql_query = "..."

with engine.connect() as conn:
    df = pd.read_sql_query(text(sql_query), conn)

df = df.dropna()
df = df.reset_index(drop=True)

df["x"] = range(len(df))
df["y"] = df.iloc[:, 0].astype(float)

p = figure(
    height=400,
    width=600,
    tools="pan,wheel_zoom,box_zoom,reset,save"
)

p.line(
    x=df["x"],
    y=df["y"],
    line_width=2
)

p.circle(
    x=df["x"],
    y=df["y"],
    size=8
)

p


CATEGORICAL BAR TEMPLATE:

IMPORTANT:
If the SQL result contains numeric columns that are actually strings (common with CSV imports), ALWAYS convert them using:
df[col] = pd.to_numeric(df[col], errors="coerce")
before assigning df["value"].


sql_query = "..."

with engine.connect() as conn:
    df = pd.read_sql_query(text(sql_query), conn)

df = df.dropna()
df = df.reset_index(drop=True)

df["category"] = df.iloc[:,0].astype(str)
df["value"] = pd.to_numeric(df.iloc[:,1], errors="coerce")
df["value"] = df["value"].astype(float)


source = ColumnDataSource(df)

p = figure(
    x_range=list(df["category"]),
    height=400,
    width=600,
    tools="pan,wheel_zoom,box_zoom,reset,save"
)

p.vbar(
    x="category",
    top="value",
    source=source,
    width=0.8
)

p
"""

    else:
        instruction = """ 
        You are an expert SQL query generator for PostgreSQL. 
        Write only valid SQL. No markdown. No explanation.
        """

    # Table schema
    try:
        insp = inspect(engine)
        columns = insp.get_columns(table_name)
        column_names = [col["name"] for col in columns]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inspect table: {e}")

    # Sample rows
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT 5'))
            df_sample = pd.DataFrame(result.fetchall(), columns=result.keys())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read table: {e}")

    schema_context = (
        f"Table name: {table_name}\n"
        f"Columns: {', '.join(column_names)}\n"
        f"Sample rows:\n{df_sample.to_string(index=False)}"
    )

    # Cohere call
    try:
        response = co.chat(
            model="command-a-03-2025",
            message=f"""
                {instruction}

                {schema_context}

                User question: "{request.user_query}"
            """,
            temperature=0,
        )
        llm_output = response.text.strip()
        print(llm_output)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cohere API error: {e}")

    # ============================
    # PLOT MODE EXECUTION SECTION
    # ============================

    if request.plot_mode:
        try:
            llm_output = llm_output.replace("```python", "").replace("```", "").strip()
            # Prepare safe execution environment
            from bokeh.plotting import figure
            from bokeh.models import ColumnDataSource

            env = {
                "engine": engine,
                "pd": pd,
                "figure": figure,
                "ColumnDataSource": ColumnDataSource,
                "text": text
            }

            local_vars = {}

            # Execute the Python code generated by the LLM
            exec(llm_output, env, local_vars)

            # Extract needed values
            sql_query = local_vars.get("sql_query")
            p = local_vars.get("p")

            if sql_query is None:
                raise ValueError("LLM code did not define sql_query")

            if p is None:
                raise ValueError("LLM code did not create a Bokeh figure 'p'")

            plot_json = json_item(p)
            print(plot_json)
            return {
                "generated_sql": sql_query,
                "plot_json": plot_json,
                "mode": "plot"
            }

        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Plot execution failed",
                    "exception": str(e),
                    "llm_code": llm_output
                }
            )

    # ============================
    # NORMAL SQL MODE
    # ============================

    sql_query = llm_output
    

    # Cast numeric-looking fields
    try:
        for col in column_names:
            sample_vals = df_sample[col].dropna().astype(str).tolist()[:5]
            if sample_vals and all(is_number(v) for v in sample_vals):
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
                "columns": column_names,
                "sample_rows": df_sample.to_dict(orient="records")
            }
        )

    return {
        "generated_sql": sql_query,
        "results": rows,
        "mode": "table"
    }
