import json
import boto3

def lambda_handler(event, context):
    client = boto3.client('bedrock-runtime', region_name='us-east-1')
    response = client.converse(
        modelId='global.amazon.nova-2-lite-v1:0',
        messages=[
            {
                'role': 'user',
                'content': [{'text': 'Can you explain the features of Amazon Bedrock?'}]
            }
        ]
    )
    print(response)