# assistants/graph.py
import os
from typing import TypedDict, Annotated, List
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import AnyMessage
import google.generativeai as genai
from django.conf import settings
# assistants/graph.py
from .cv import get_latest_cv_text
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import AIMessage


# State keeps the running chat messages
class State(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]

openai_key = getattr(settings, "OPEN_API_KEY", "") or os.getenv("OPEN_API_KEY", "")
llm = ChatOpenAI(api_key=openai_key,
model="gpt-4o-mini", temperature=0.2)  # uses OPENAI_API_KEY

BASE_SYSTEM = (
    "You are the Portfolio Assistant. Be concise and helpful. "
    "Answer questions about the user's background/skills/experience strictly from the CV context. "
    "If something isn't in the CV, say you don't have that detail."
)

def call_model(state: State):
    cv_text = get_latest_cv_text()
    cv_block = (
        f"\n\n<CV_CONTEXT>\n{cv_text[:8000]}\n</CV_CONTEXT>\n"
        if cv_text else
        "\n\n<CV_CONTEXT>\nNo CV found or unreadable.\n</CV_CONTEXT>\n"
    )

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", BASE_SYSTEM + cv_block),
        ("user", "{user_query}")
    ])

    # pull latest user message text
    user_query = state["messages"][-1].content if state["messages"] else ""

    try:
        # --- OpenAI branch ---
        print("TOKEN COUNT:", llm.get_num_tokens(prompt_template.format(user_query=user_query)))
        response = llm.invoke(prompt_template.format(user_query=user_query))
        reply = response.content
    except Exception as e:
        print(f"[OpenAI Fallback] {e}. Using Gemini instead.")
        # --- Gemini branch ---
        gem_key = getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
        genai.configure(api_key=gem_key)
        gemini_model = genai.GenerativeModel("gemini-1.5-flash")

        gem_resp = gemini_model.generate_content(
            [prompt_template.format(user_query=user_query)]
        )
        reply = gem_resp.text or "Sorry, Gemini did not return a reply."

    # Update state like your pattern
    state["messages"] = [AIMessage(content=reply)]
    return {"messages": state["messages"]}


_graph = StateGraph(State)
_graph.add_node("model", call_model)
_graph.add_edge(START, "model")
_graph.add_edge("model", END)
app = _graph.compile()
