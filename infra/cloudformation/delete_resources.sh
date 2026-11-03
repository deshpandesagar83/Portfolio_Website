#!/bin/sh

# Deletes every resource listed in infra/out/<stack>.tsv (written by update_portfolio_cf_stack.sh),
# Each line of the file is: <resource type><TAB><physical id>
# Meant for resources a stack leaves behind (DeletionPolicy: Retain). This is permanent.
# A failure (e.g. a non-empty bucket) is logged and the script moves on. The out file is
# Usage: sh infra/cloudformation/delete_resources.sh <stack-name>
# The stack name is passed in by update_portfolio_cf_stack.sh.

set -u
cd "$(dirname "$0")/../.." || exit 1

STACK="${1:?usage: delete_resources.sh <stack-name>}"
OUT_FILE="infra/out/$STACK.tsv"
TAB=$(printf '\t')
CR=$(printf '\r')

if [ ! -f "$OUT_FILE" ]; then
  echo "No $OUT_FILE, no resources to delete."
  exit 0
fi

failed=0
while IFS="$TAB" read -r type id; do
  [ -z "$type" ] && continue
  # The Windows AWS CLI writes CRLF line endings; drop the trailing \r from the id.
  id=${id%"$CR"}
  echo "Deleting $type $id ..."

  if ! token=$(aws cloudcontrol delete-resource --type-name "$type" --identifier "$id" --query "ProgressEvent.RequestToken" --output text 2>&1); then
    echo "  FAILED: $token"
    failed=1
    continue
  fi

  # delete-resource is asynchronous; wait for the request to finish.
  if aws cloudcontrol wait resource-request-success --request-token "$token" 2>/dev/null; then
    echo "  Deleted."
  else
    detail=$(aws cloudcontrol get-resource-request-status --request-token "$token" --query "ProgressEvent.[ErrorCode,StatusMessage]" --output text 2>&1)
    echo "  FAILED: $detail"
    failed=1
  fi
done < "$OUT_FILE"

if [ "$failed" -eq 0 ]; then
  echo "All resources deleted."
else
  echo "Some resources were not deleted"
  exit 1
fi
