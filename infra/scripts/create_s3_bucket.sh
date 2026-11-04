#!/bin/sh

# Deploys cloudformation_s3.yaml, creating the bucket only if it does not already exist.
# The bucket is DeletionPolicy: Retain, so it survives stack deletes; on the next run
# Default region is configured using aws configure and is set to ca-central-1

set -u
cd "$(dirname "$0")/../.." || exit 1

TEMPLATE=infra/cloudformation/cloudformation_s3.yaml

if [ ! -f "$TEMPLATE" ]; then
  echo "Template not found: $TEMPLATE"
  exit 1
fi

BUCKET=$(grep '^BUCKET_NAME=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"'"'")
if [ -z "$BUCKET" ]; then
  echo "BUCKET_NAME is not set in .env"
  exit 1
fi

STACK=$(grep '^STACK_NAME=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"'"'")
if [ -z "$STACK" ]; then
  echo "STACK_NAME is not set in .env"
  exit 1
fi

if aws s3api head-bucket --bucket "$BUCKET" > /dev/null 2>&1; then
  echo "Bucket $BUCKET already exists, not creating it."
else
  echo "Bucket $BUCKET not found, the stack will create it."
  # Calling another shell script
  sh infra/scripts/deploy_stack.sh "$STACK" "$TEMPLATE" BucketName="$BUCKET"
fi


