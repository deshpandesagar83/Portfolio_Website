# Setup

## Prerequisites
- AWS CLI configured (`aws configure`).
- An ACM certificate for the domain in **us-east-1** (CloudFront only accepts certificates from there). Public certificates are free.
- A Route53 hosted zone for the domain.

**Note:**
This project uses the default region `ca-central-1`.


# File Details
| File | Description |
| :---: | :---: |
| cloudformation/s3.yaml | Cloudformation script which creates the S3 website bucket (retained when the stack is deleted) |
| cloudformation/cloudfront.yaml | Cloudformation script which creates the cloudfront resources listed below |
| cloudformation/waf.yaml | Cloudformation script (us-east-1) which creates the WAF web ACL. Independent of the CloudFront stack |
| scripts/create_waf.sh | Deploys the WAF stack in us-east-1 and prints the web ACL ARN |
| scripts/create_s3_bucket.sh | Deploys the S3 stack, but only if the bucket does not exist yet |
| scripts/delete_s3_bucket.sh | Deletes the (empty) website bucket |
| scripts/deploy_stack.sh | Deploys any template as a stack. Usage: `sh infra/scripts/deploy_stack.sh <stack-name> <template> [Key=Value ...]` |
| scripts/delete_stack.sh | Deletes a stack and waits for it. Usage: `sh infra/scripts/delete_stack.sh <stack-name>` |
| scripts/create_cloudfront.sh | Deploys the CloudFront stack and prints the distribution domain name |
| scripts/check_permissions.sh | Lists the IAM actions a template needs and which ones the current identity is missing |
| test-site/index.html, test-site/404.html | Minimal pages for testing the distribution and the 404 handling |



## Environment Variables
The scripts read these values from a `.env` file at the repo root.

| Key | Description |
| :---: | :---: |
| BUCKET_NAME | Static name of the website bucket (bucket names are global, so it must be unique) |
| S3_STACK_NAME | Name of the S3 stack |
| CLOUDFRONT_STACK_NAME | Name of the CloudFront stack |
| CERTIFICATE_ARN | ARN of the ACM certificate (us-east-1) |
| DOMAIN_NAME | Domain served by the site, e.g. example.com |
| WAF_STACK_NAME | Name of the WAF stack (deployed in us-east-1) |
| WEB_ACL_ARN | ARN of the web ACL (us-east-1), printed by `create_waf.sh` |

# Deploying

Run the scripts from the repo root, in this order.

1. Create the bucket
   ```bash
   sh infra/scripts/create_s3_bucket.sh
   ```
2. Create the web ACL (us-east-1), then copy the printed ARN into `.env` as `WEB_ACL_ARN`
   ```bash
   sh infra/scripts/create_waf.sh
   ```
3. Create the CloudFront stack
   ```bash
   sh infra/scripts/create_cloudfront.sh
   ```
   It prints the distribution domain name (`dxxxxxxxx.cloudfront.net`) at the end.
4. Create the DNS records in Route53 (see below).
5. Use the deployed frontend from out `/frontend/out` and copy the contents to `s3://<bucket-name>/frontend`, then invalidate `/*` (the managed cache policy caches for a day by default)


## Updating one service
- WAF rules: edit `waf.yaml` and run `create_waf.sh`. The ARN stays the same, so CloudFront needs no redeploy.
- CloudFront: edit `cloudfront.yaml` and run `create_cloudfront.sh`. The WAF stack is not touched.
- Only a replaced web ACL (e.g. a changed `Name`) gets a new ARN. Then update `WEB_ACL_ARN` and redeploy CloudFront.

## Route53 records
In the hosted zone create two alias records for the domain, both pointing at the distribution domain name printed in step 2:
- `A` record
- `AAAA` record (IPv6 is enabled on the distribution)

The `cloudfront.net` address changes if the CloudFront stack is deleted and recreated, so the records must be updated when that happens. Updating the stack in place keeps the address.

# Deleting
- `sh infra/scripts/delete_stack.sh <stack-name>` removes a stack.
- A distribution on a pricing plan cannot be deleted, and a web ACL still attached to a distribution cannot be deleted. Tear down in this order:
  1. Cancel the Free plan, if subscribed (Free plans cancel immediately)
  2. Delete the CloudFront stack
  3. Delete the WAF stack: `AWS_REGION=us-east-1 sh infra/scripts/delete_stack.sh <waf-stack>`
- Deleting the S3 stack keeps the bucket (`DeletionPolicy: Retain`).
- Deleting the CloudFront stack deletes everything in `cloudfront.yaml`: the distribution, OAC, URL rewrite function and bucket policy. Nothing there is retained. The web ACL is in its own stack and survives.
- The bucket must be empty before `delete_s3_bucket.sh` can remove it.

# AWS Resources
- S3
  - Lifecycle Policies
    - Noncurrent object versions expire (`ExpireOldVersions`)
    - Objects under `cloudfront_logs/` expire after 90 days (`ExpireCloudFrontLogs`)
  - Versioning
  - Ownership
    - `BucketOwnerPreferred`, so ACLs are enabled. CloudFront legacy logging needs this
    - An existing bucket does not pick up a change here because the create script skips the deploy when the bucket exists
  - ACL
    - CloudFront sets up its own log delivery ACL on the bucket when logging is enabled
  - Bucket Policy (configured in cloudfront.yaml)
    - Allows `s3:GetObject` for CloudFront on `frontend/*` only, limited to this distribution
    - Denies CloudFront reads on `cloudfront_logs/*` as a second guard, so logs are never served publicly
- Cloudfront
  - Functions
    - `UrlRewrite` (viewer-request) appends `index.html` to directory-style URLs such as `/workflow/`, because the S3 REST origin does not resolve directory indexes
    - Source is `infra/functions/url-rewrite.js`, passed in by `create_cloudfront.sh` (max 4096 bytes)
  - OAC
    - Signs requests to the private bucket (`sigv4`, `always`)
  - Cache
    - AWS managed `CachingOptimized` policy (min 1 second, default 1 day, max 1 year). The Free plan does not allow custom cache policies
    - gzip and brotli enabled, no cookies, headers or query strings in the cache key
    - Invalidate after every upload, or visitors see the old build for up to a day
  - Distribution
    - Alias is the domain name, ACM certificate with `TLSv1.2_2021` and SNI only
    - The origin path is `/frontend`, so the site is served from the `frontend/` prefix of the bucket
    - `index.html` is the default root object
    - Missing objects return `/404.html` with a 404 status (a private bucket returns 403 for missing keys, so 403 is mapped too)
    - HTTP is redirected to HTTPS, GET and HEAD only, compression on
    - AWS managed security headers policy
    - HTTP/2 and HTTP/3, IPv6 enabled
    - `PriceClass_100`
    - No access logging (the Free plan does not include it). Old logs under `cloudfront_logs/` expire through the bucket lifecycle rule
    - WAF web ACL attached (required by the Free plan, cannot be detached while subscribed)
- WAF (us-east-1, `waf.yaml`)
  - Default action is allow. Uses 4 of the 5 rules the Free plan allows:
    1. `AWSManagedRulesAmazonIpReputationList` (block)
    2. Rate limit per IP, 1000 requests per 5 minutes by default (`RateLimit` parameter, block)
    3. `AWSManagedRulesKnownBadInputsRuleSet` (block)
    4. `AWSManagedRulesCommonRuleSet` (count only; switch to block once the security dashboard shows no false positives)
  - CloudWatch metrics and sampled requests on, for the security dashboard. No WAF request logs (not in the Free plan)
- Pricing plan
  - CloudFront flat-rate Free plan: $0/month, 1M requests and 100 GB a month, no overage charges. Requests blocked by WAF do not count
  - Not managed by any stack yet. It links the distribution and the web ACL, so it belongs to neither stack

# Notes
- Never run `aws s3 sync --delete` against the bucket without `--exclude "cloudfront_logs/*"`, or it deletes the logs.
- All stacks are deployed with `deploy_stack.sh`, which uses `--no-fail-on-empty-changeset`, so re-running with no changes is safe.
- A failed first deploy leaves the stack in `ROLLBACK_COMPLETE`. Delete it with `delete_stack.sh` before trying again.
- To find the IAM permissions a template needs, run `sh infra/scripts/check_permissions.sh` against it (not tested yet).
