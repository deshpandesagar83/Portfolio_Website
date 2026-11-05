#!/bin/sh

# The bucket name comes from BUCKET_NAME in .env at the repo root.
# The bucket delete is permanent. A non-empty bucket is not emptied: the error is logged.
# Default region is configured using aws configure and is set to ca-central-1

set -u
cd "$(dirname "$0")/../.." || exit 1

BUCKET=$(grep '^BUCKET_NAME=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"'"'")
if [ -z "$BUCKET" ]; then
  echo "BUCKET_NAME is not set in .env"
  exit 1
fi

if aws s3api head-bucket --bucket "$BUCKET" > /dev/null 2>&1; then
  echo "Deleting bucket $BUCKET ..."
  if err=$(aws s3api delete-bucket --bucket "$BUCKET" 2>&1); then
    echo "Deleted."
  else
    echo "FAILED: $err"
    exit 1
  fi
else
  echo "Bucket $BUCKET not found, nothing to delete."
fi
