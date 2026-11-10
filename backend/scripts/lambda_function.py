import json, os, boto3

KB_ID = os.environ["KB_ID"]
SYSTEM = (
    "You are an assistant on Sagar's portfolio site, answering recruiters' questions about his "
    "background. Use ONLY the context below. If the answer isn't in it, say you don't know. "
    "Reply in plain, natural spoken-style sentences, no markdown or bullet lists, under 140 words."
)

kb = boto3.client("bedrock-agent-runtime")
bedrock_client = boto3.client('bedrock-runtime')


def lambda_handler(event, context):
    question = "What is my name?"
    
    res = kb.retrieve(
        knowledgeBaseId=KB_ID,
        retrievalQuery={"text": question},
        retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 3}},
    )

    chunks = [r["content"]["text"] for r in res["retrievalResults"]]

    out = bedrock_client.converse(
        modelId='global.amazon.nova-2-lite-v1:0',
        system=[{"text": SYSTEM + "\n\nContext:\n" + "\n---\n".join(chunks)}],
        messages=[{"role": "user", "content": [{"text": question}]}],
        inferenceConfig={"maxTokens": 300, "temperature": 0.3},
    )
    
    print(out)
    answer = out["output"]["message"]["content"][0]["text"]
    print(answer)