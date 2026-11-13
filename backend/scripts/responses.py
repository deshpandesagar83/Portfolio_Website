from enum import Enum

# API Gateway’s own codes are left out (403, 502, 504), since the Lambda never returns them.
class ChatResponse(Enum):
    """HTTP status code and client-facing message for each outcome of the chat Lambda."""

    # 200
    OK = (200, None)

    # 400
    INVALID_JSON = (400, "The request body must be valid JSON.")
    MISSING_MESSAGE = (400, "Please include a message.")
    MESSAGE_TOO_LONG = (400, "That message is too long. Please keep it under 500 characters.")

    # 429
    CONVERSATION_LIMIT = (429, "This conversation has reached its message limit. Please start a new one.")
    MODEL_THROTTLED = (429, "I'm getting a lot of questions right now. Please try again in a moment.")

    # 503
    KILL_SWITCH = (503, "The chatbot is taking a break right now. Please try again later.")
    UPSTREAM_UNAVAILABLE = (503, "I couldn't reach my knowledge source. Please try again shortly.")

    # 500
    INTERNAL_ERROR = (500, "Something went wrong on my end. Please try again.")

    def __init__(self, status_code, message):
        self.status_code = status_code
        self.message = message
