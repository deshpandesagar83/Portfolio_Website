#!/bin/sh

#The IAM permissions are configured separately, which is why you might run into errors when creating the stack.
#This script deletes the old stack and its resources, then creates a new stack.
#Resources to delete are read from infra/out/<stack>.tsv, written by the previous run.
#Default region is configured using aws configure and is set to ca-central-1

set -u
cd "$(dirname "$0")/../.." || exit 1

STACK="${1:-portfolio-stack}"
TEMPLATE=infra/cloudformation/site.yaml
OUT_DIR=infra/out
OUT_FILE="$OUT_DIR/$STACK.tsv"


# Delete the stack
STACK_ID=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].StackId" --output text 2>/dev/null)
if [ -n "$STACK_ID" ]; then
    echo "Deleting $STACK ..."
    aws cloudformation delete-stack --stack-name "$STACK_ID"

  if aws cloudformation wait stack-delete-complete --stack-name "$STACK_ID"; then
    echo "Deleted."
  else
    echo "Delete did not complete. Failed events:"
    aws cloudformation describe-stack-events \
        --stack-name "$STACK_ID" \
        --query "StackEvents[?contains(ResourceStatus,'FAILED')].[LogicalResourceId,ResourceStatus,ResourceStatusReason]" \
        --output table
    exit 1
  fi
else
  echo "No existing stack named $STACK, skipping stack delete."
fi

# Delete what the stack left behind, per the out file. Failures are logged, not fatal.
sh infra/cloudformation/delete_resources.sh "$STACK"


# Deploy new stack
echo "Deploying $STACK ..."
if aws cloudformation deploy --template-file "$TEMPLATE" --stack-name "$STACK" --no-fail-on-empty-changeset > /dev/null; then
    echo "Deployed $STACK."

    # Record the resources, one "<type><TAB><physical id>" per line, for delete_resources.sh
    mkdir -p "$OUT_DIR"
    aws cloudformation list-stack-resources --stack-name "$STACK" \
        --query "StackResourceSummaries[].[ResourceType,PhysicalResourceId]" \
        --output text > "$OUT_FILE"
    echo "Resources saved to $OUT_FILE"
else
    echo "Deploy failed. Failed events:"
    aws cloudformation describe-stack-events \
        --stack-name "$STACK" \
        --query "StackEvents[?contains(ResourceStatus,'FAILED')].[LogicalResourceId,ResourceStatus,ResourceStatusReason]" \
        --output table
    exit 1
fi
