from fastapi import APIRouter
import cohere
from ..config import COHERE_API_KEY

router = APIRouter(prefix="/nlp", tags=["NLP"])
co = cohere.Client(COHERE_API_KEY)

@router.post("/translate")
async def translate_to_sql(prompt: dict):
    user_query = prompt.get("query")
    response = co.generate(
        model="command-r",
        prompt=f"Translate this natural language to SQL:\n\n{user_query}\n\nSQL:",
        max_tokens=100
    )
    return {"sql": response.generations[0].text.strip()}
