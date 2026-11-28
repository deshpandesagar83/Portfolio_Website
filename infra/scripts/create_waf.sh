#!/bin/sh

# Deploys waf.yaml in us-east-1 (CLOUDFRONT-scope web ACLs exist only there) and prints the web ACL ARN.
# Reads WAF_STACK_NAME from .env at the repo root.
# Independent of the CloudFront stack. Copy the printed ARN into .env as WEB_ACL_ARN the first time;
# later rule changes keep the same ARN, so CloudFront does not need a redeploy.

set -u
cd "$(dirname "$0")/../.." || exit 1

TEMPLATE=infra/cloudformation/waf.yaml
if [ ! -f "$TEMPLATE" ]; then
  echo "Template not found: $TEMPLATE"
  exit 1
fi

STACK=$(grep '^WAF_STACK_NAME=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"'"'")
if [ -z "$STACK" ]; then
  echo "WAF_STACK_NAME is not set in .env"
  exit 1
fi

AWS_REGION=us-east-1 sh infra/scripts/deploy_stack.sh "$STACK" "$TEMPLATE" || exit 1

echo "Web ACL ARN (WEB_ACL_ARN in .env):"
AWS_REGION=us-east-1 aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='WebAclArn'].OutputValue" \
  --output text | tr -d '\r'
