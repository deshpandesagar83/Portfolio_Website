#!/bin/sh

# Deploys any CloudFormation template as a stack.
# Usage: sh infra/scripts/deploy_stack.sh <stack-name> <template> [Key=Value ...]
# The template path is relative to the repo root. Extra arguments are passed as parameter overrides.
# Default region is configured using aws configure and is set to ca-central-1

set -u
cd "$(dirname "$0")/../.." || exit 1

STACK="${1:?usage: deploy_stack.sh <stack-name> <template> [Key=Value ...]}"
TEMPLATE="${2:?usage: deploy_stack.sh <stack-name> <template> [Key=Value ...]}"
shift 2

if [ ! -f "$TEMPLATE" ]; then
  echo "Template not found: $TEMPLATE"
  exit 1
fi

echo "Deploying $STACK ..."
# ${1:+...} adds --parameter-overrides only when parameters were passed.
if aws cloudformation deploy \
    --template-file "$TEMPLATE" \
    --stack-name "$STACK" \
    ${1:+--parameter-overrides "$@"} \
    --no-fail-on-empty-changeset > /dev/null; then
  echo "Deployed $STACK."
else
  echo "Deploy failed. Failed events:"
  aws cloudformation describe-stack-events \
      --stack-name "$STACK" \
      --query "StackEvents[?contains(ResourceStatus,'FAILED')].[LogicalResourceId,ResourceStatus,ResourceStatusReason]" \
      --output table
  exit 1
fi
