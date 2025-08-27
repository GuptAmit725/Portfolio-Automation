# assistants/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .graph import app

class AgentChatView(APIView):
    """
    POST { "message": "..." }
    Returns: { "reply": "..." }
    """

    def post(self, request):
        user_msg = (request.data or {}).get("message", "").strip()
        if not user_msg:
            return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

        result = app.invoke({"messages": [("user", user_msg)]})
        # last assistant message
        msgs = result.get("messages", [])
        reply = msgs[-1].content if msgs else ""
        return Response({"reply": reply})
