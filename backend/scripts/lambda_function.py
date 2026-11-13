import json, logging, os, boto3
from botocore.exceptions import BotoCoreError, ClientError

from responses import ChatResponse

logger = logging.getLogger()
logger.setLevel(logging.INFO)

KB_ID = os.environ["KB_ID"]
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
MODEL_ID = 'global.amazon.nova-2-lite-v1:0'
MAX_MESSAGE_LENGTH = 500
# TODO: make the system prompt more generic
SYSTEM = (
    "You are an assistant on a portfolio site, answering recruiters' questions about his "
    "background. Use ONLY the context below. If the answer isn't in it, say you don't know. "
    "Reply in plain, natural spoken-style sentences, no markdown or bullet lists, under 140 words."
)

THROTTLE_CODES = {"ThrottlingException", "TooManyRequestsException"}
UNAVAILABLE_CODES = {
    "ServiceUnavailableException",
    "InternalServerException",
    "ModelNotReadyException",
    "ModelTimeoutException",
}

kb = boto3.client("bedrock-agent-runtime")
bedrock_client = boto3.client('bedrock-runtime')


def lambda_response(response, answer=None):
    body = {"answer": answer} if response is ChatResponse.OK else {"error": response.message}
    return {
        "statusCode": response.status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        },
        "body": json.dumps(body),
    }

def lambda_handler(event, context):
    
    try:
        payload = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        return lambda_response(ChatResponse.INVALID_JSON)

    if not isinstance(payload, dict):
        return lambda_response(ChatResponse.INVALID_JSON)
        
    message = payload.get("message")
    if not isinstance(message, str) or not message.strip():
        return lambda_response(ChatResponse.MISSING_MESSAGE)
    
    question = message.strip()
    if len(question) > MAX_MESSAGE_LENGTH:
        return lambda_response(ChatResponse.MESSAGE_TOO_LONG)
    

    try:
        res = kb.retrieve(
            knowledgeBaseId=KB_ID,
            retrievalQuery={"text": question},
            retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 3}},
        )
        chunks = [r["content"]["text"] for r in res["retrievalResults"]]

        out = bedrock_client.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM + "\n\nContext:\n" + "\n---\n".join(chunks)}],
            messages=[{"role": "user", "content": [{"text": question}]}],
            inferenceConfig={"maxTokens": 300, "temperature": 0.3},
        )
        answer = out["output"]["message"]["content"][0]["text"]
    except ClientError as e:
        code = e.response["Error"]["Code"]
        logger.error("AWS call failed: %s", code, exc_info=True)
        if code in THROTTLE_CODES:
            return lambda_response(ChatResponse.MODEL_THROTTLED)
        if code in UNAVAILABLE_CODES:
            return lambda_response(ChatResponse.UPSTREAM_UNAVAILABLE)
        return lambda_response(ChatResponse.INTERNAL_ERROR)
    except BotoCoreError:
        # Connection errors, timeouts, etc. before AWS returned a response.
        logger.error("Could not reach AWS", exc_info=True)
        return lambda_response(ChatResponse.UPSTREAM_UNAVAILABLE)
    except Exception:
        logger.exception("Unexpected error")
        return lambda_response(ChatResponse.INTERNAL_ERROR)

    return lambda_response(ChatResponse.OK, answer)
