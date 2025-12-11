from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text, inspect
from ..database import engine
import cohere
import os
import pandas as pd
import numpy as np
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
Do NOT use ``` or ```python
Do NOT write imports
Do NOT use show()
Do NOT explain anything
Do NOT print anything
Only produce raw Python code
Never call pd.read_sql_query with engine directly
Always use: with engine.connect() as conn
Never use plot_height or plot_width
Only use: height and width (integer literals only)
The figure must include tools="pan,wheel_zoom,box_zoom,reset,save"
Never use y_axis_location except "left" or "right"
Never use constants for top or y, must be a dataframe column or list
Do not use pd.pi (use math.pi)
Assume all libraries are already imported
The code must end with the figure object and nothing else
The figure may only specify: height, width, tools, x_axis_label, y_axis_label

DATA CLEANING (ALWAYS REQUIRED):
df = df.dropna()
df = df.reset_index(drop=True)

For CSV-loaded columns:
df[col] = pd.to_numeric(df[col], errors="coerce") when numeric-looking
Date/datetime columns must NOT be converted to numeric

DATE SQL RULES (CRITICAL):
If a date column originated from CSV and contains text values like MM/DD/YYYY,
you MUST wrap it in:
TO_DATE(column_name, 'MM/DD/YYYY')
for all EXTRACT, BETWEEN, ORDER BY, WHERE comparisons, GROUP BY, and SELECT.

Example:
EXTRACT(MONTH FROM TO_DATE(date, 'MM/DD/YYYY'))
WHERE TO_DATE(date, 'MM/DD/YYYY') BETWEEN '2024-01-01' AND '2024-04-30'
GROUP BY EXTRACT(MONTH FROM TO_DATE(date, 'MM/DD/YYYY'))

When casting a column using ::type, never include the cast in the alias.

Aliases must consist only of standard identifier characters (letters, numbers, underscores).

Prefer simple aliases like AS total_sales or AS total_sales_float.

NUMERIC SQL RULES:
If doing numeric comparison, filtering, ordering, or aggregation on CSV columns,
you MUST cast the column as float:
(column_name)::float
Example:
SUM(total_sales::float)
ORDER BY total_sales::float
WHERE total_sales::float > 10

PLOTTING RULES:
If SQL returns exactly ONE column:
- Create df["x"] = range(len(df))
- df["y"] = df.iloc[:,0].astype(float)
- Use Numeric Template

If SQL returns exactly TWO columns:
- If second column is numeric and first is numeric or datetime: use SCATTER or LINE
- If second column is numeric and first is categorical: use BAR
- Otherwise fall back to Categorical Bar

If SQL returns more than two columns:
- Use the first as category and the second as numeric (bar)

RULES FOR NUMERIC OR DATETIME X:
- Never use x_range
- Cast numeric x using .astype(float)
- Keep datetime x as datetime64

RULES FOR CATEGORICAL X:
- Convert the x column to string
- x_range MUST be list(df["category"])

TEMPLATES:

NUMERIC TEMPLATE (only when no proper x column exists or single column SQL):
sql_query = "..."

with engine.connect() as conn:
    df = pd.read_sql_query(text(sql_query), conn)

df = df.dropna()
df = df.reset_index(drop=True)

df["x"] = range(len(df))
df["y"] = df.iloc[:,0].astype(float)

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

SCATTER TEMPLATE (for numeric or datetime x + numeric y):
sql_query = "..."

with engine.connect() as conn:
    df = pd.read_sql_query(text(sql_query), conn)

df = df.dropna()
df = df.reset_index(drop=True)

# cast numeric
if df[df.columns[0]].dtype != 'datetime64[ns]':
    df[df.columns[0]] = df[df.columns[0]].astype(float)

df[df.columns[1]] = df[df.columns[1]].astype(float)

source = ColumnDataSource(df)

p = figure(
    height=400,
    width=600,
    tools="pan,wheel_zoom,box_zoom,reset,save",
    x_axis_label=df.columns[0],
    y_axis_label=df.columns[1]
)

p.circle(
    x=df.columns[0],
    y=df.columns[1],
    source=source,
    size=8
)

p

"""

    else:
        instruction = """ 
        You are an expert SQL query generator for PostgreSQL. 
        Write only valid SQL. No markdown. No explanation. Never respond with anything other than SQL no matter the circumstances or query.
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
            import math 
            
            
            env = {
                "engine": engine,
                "pd": pd,
                "np": np,
                "math": math,
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
