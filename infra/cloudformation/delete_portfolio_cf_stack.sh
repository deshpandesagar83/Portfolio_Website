#!/bin/sh

# This script deletes the old stack
# The templatle will retain resources so stack can safely be deleted
# Default region is configured using aws configure and is set to ca-central-1

set -u

STACK="${1:-portfolio-stack}"
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
  echo "No existing stack named $STACK, skipping delete."
fi