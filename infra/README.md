# Setup

## Prerequisites
- AWS CLI configured (`aws configure`).
- An ACM certificate for the domain in **us-east-1** (CloudFront only accepts certificates from there). Public certificates are free.
- A Route53 hosted zone for the domain.

**Note:**
This project uses the default region is `ca-central-1`.


# File Details
| File | Description |
| :---: | :---: |
| cloudformation/s3.yaml | Cloudformation script which creates the S3 website bucket (retained when the stack is deleted) |
| cloudformation/cloudfront.yaml | Cloudformation script which creates the cloudfront resources listed below |
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

# Deploying

Run the scripts from the repo root, in this order.

1. Create the bucket
   ```bash
   sh infra/scripts/create_s3_bucket.sh
   ```
2. Create the CloudFront stack
   ```bash
   sh infra/scripts/create_cloudfront.sh
   ```
   It prints the distribution domain name (`dxxxxxxxx.cloudfront.net`) at the end.
3. Create the DNS records in Route53 (see below).
4. Use the deployed frontend from out `/frontend/out` and copy the contents to `s3://<bucket-name>/frontend`


## Route53 records
In the hosted zone create two alias records for the domain, both pointing at the distribution domain name printed in step 2:
- `A` record
- `AAAA` record (IPv6 is enabled on the distribution)

The `cloudfront.net` address changes if the CloudFront stack is deleted and recreated, so the records must be updated when that happens. Updating the stack in place keeps the address.

# Deleting
- `sh infra/scripts/delete_stack.sh <stack-name>` removes a stack.
- Deleting the S3 stack keeps the bucket (`DeletionPolicy: Retain`).
- Deleting the CloudFront stack deletes everything in `cloudfront.yaml`: the distribution, OAC, cache policy, URL rewrite function and bucket policy. Nothing there is retained.
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
    - Cache policy with short TTLs for testing (min 0, default 60, max 300 seconds). Raise them for production
    - gzip and brotli enabled, no cookies, headers or query strings in the cache key
  - Distribution
    - Alias is the domain name, ACM certificate with `TLSv1.2_2021` and SNI only
    - The origin path is `/frontend`, so the site is served from the `frontend/` prefix of the bucket
    - `index.html` is the default root object
    - Missing objects return `/404.html` with a 404 status (a private bucket returns 403 for missing keys, so 403 is mapped too)
    - HTTP is redirected to HTTPS, GET and HEAD only, compression on
    - AWS managed security headers policy
    - HTTP/2 and HTTP/3, IPv6 enabled
    - `PriceClass_100`
    - Legacy standard logging to `cloudfront_logs/` in the website bucket

# Notes
- Never run `aws s3 sync --delete` against the bucket without `--exclude "cloudfront_logs/*"`, or it deletes the logs.
- Both stacks are deployed with `deploy_stack.sh`, which uses `--no-fail-on-empty-changeset`, so re-running with no changes is safe.
- A failed first deploy leaves the stack in `ROLLBACK_COMPLETE`. Delete it with `delete_stack.sh` before trying again.
- To find the IAM permissions a template needs, run `sh infra/scripts/check_permissions.sh` against it (not tested yet).
