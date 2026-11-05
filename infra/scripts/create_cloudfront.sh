#!/bin/sh

# Deploys cloudfront.yaml, then prints the distribution domain name for the Route53 records.
# Reads these values from .env at the repo root: CLOUDFRONT_STACK_NAME, BUCKET_NAME, CERTIFICATE_ARN (us-east-1), DOMAIN_NAME
# The website bucket must already exist (see create_s3_bucket.sh).
# Also passes infra/functions/url-rewrite.js to the template as the CloudFront Function body.
# Default region is configured using aws configure and is set to ca-central-1

set -u
cd "$(dirname "$0")/../.." || exit 1

TEMPLATE=infra/cloudformation/cloudfront.yaml
if [ ! -f "$TEMPLATE" ]; then
  echo "Template not found: $TEMPLATE"
  exit 1
fi

STACK=$(grep '^CLOUDFRONT_STACK_NAME=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"'"'")
if [ -z "$STACK" ]; then
  echo "CLOUDFRONT_STACK_NAME is not set in .env"
  exit 1
fi

BUCKET=$(grep '^BUCKET_NAME=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"'"'")
if [ -z "$BUCKET" ]; then
  echo "BUCKET_NAME is not set in .env"
  exit 1
fi

CERT=$(grep '^CERTIFICATE_ARN=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"'"'")
if [ -z "$CERT" ]; then
  echo "CERTIFICATE_ARN is not set in .env"
  exit 1
fi

DOMAIN=$(grep '^DOMAIN_NAME=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"'"'")
if [ -z "$DOMAIN" ]; then
  echo "DOMAIN_NAME is not set in .env"
  exit 1
fi

# CloudFront only accepts certificates from us-east-1.
echo "$CERT" | grep -q '^arn:aws:acm:us-east-1:' || { echo "CERTIFICATE_ARN must be an ACM certificate in us-east-1"; exit 1; }

if ! aws s3api head-bucket --bucket "$BUCKET" > /dev/null 2>&1; then
  echo "Bucket $BUCKET not found or not accessible. Create it first with create_s3_bucket.sh."
  exit 1
fi

REWRITE_FUNCTION=infra/functions/url-rewrite.js
if [ ! -f "$REWRITE_FUNCTION" ]; then
  echo "Function file not found: $REWRITE_FUNCTION"
  exit 1
fi
REWRITE_FUNCTION=$(tr -d '\r' < "$REWRITE_FUNCTION")

sh infra/scripts/deploy_stack.sh "$STACK" "$TEMPLATE" \
  WebsiteBucketName="$BUCKET" \
  Certificate="$CERT" \
  DomainName="$DOMAIN" \
  UrlRewriteFunction="$REWRITE_FUNCTION" || exit 1

# Show what the Route53 records should point to.
echo "Distribution Domain:"
aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
  --output text | tr -d '\r'
