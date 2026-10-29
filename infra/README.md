# Infra

Static hosting for the portfolio: private S3 bucket behind CloudFront on the apex domain,
deployed by `.github/workflows/deploy.yml` (GitHub only reads workflows from the repo root).
Everything runs in **us-east-1**. See `PIPELINE_PLAN.md` for the design.

```
cloudformation/site.yaml         the stack the pipeline deploys
bootstrap/deploy-identity.yaml   one-time: IAM user + least-privilege policy + staging bucket
bootstrap/oidc.yaml              not applied: OIDC provider + role, for migrating off access keys
```

## Local deploy

Build the site locally, then deploy the stack and upload with your own AWS credentials.
The bootstrap IAM user below is only for the pipeline.

1. Find the hosted zone ID (Route53 creates the zone when the domain is registered there):

   ```bash
   aws route53 list-hosted-zones-by-name --dns-name <DOMAIN> \
     --query 'HostedZones[0].Id' --output text
   ```

   Use the part after `/hostedzone/`.

2. Deploy the stack. The first run takes ~5-20 min (certificate validation + distribution):

   ```bash
   aws cloudformation deploy --region us-east-1 \
     --template-file infra/cloudformation/site.yaml \
     --stack-name gethired-site --no-fail-on-empty-changeset \
     --parameter-overrides DomainName=<DOMAIN> HostedZoneId=<ZONE_ID>
   ```

3. Read the outputs:

   ```bash
   BUCKET=$(aws cloudformation describe-stacks --region us-east-1 --stack-name gethired-site \
     --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
   DIST=$(aws cloudformation describe-stacks --region us-east-1 --stack-name gethired-site \
     --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text)
   ```

4. Upload `frontend/out/`, hashed assets first so no HTML references a missing file. Only
   `_next/static/` is immutable; `public/` images are unhashed.

   ```bash
   aws s3 sync frontend/out/_next/static/ "s3://$BUCKET/_next/static/" \
     --cache-control 'public,max-age=31536000,immutable' --delete
   aws s3 sync frontend/out/ "s3://$BUCKET/" --exclude '_next/static/*' \
     --cache-control 'public,max-age=0,must-revalidate' --delete
   aws cloudfront create-invalidation --distribution-id "$DIST" --paths '/*'
   ```

The site bucket is retained if the stack is deleted; empty and delete it by hand if you
really mean to remove the site.

## Bootstrap (once, by hand)

1. Apply the deploy identity (stack name and `SiteStackName` should match the `STACK_NAME` variable below):

   ```bash
   aws cloudformation deploy --region us-east-1 \
     --template-file infra/bootstrap/deploy-identity.yaml \
     --stack-name gethired-bootstrap --capabilities CAPABILITY_NAMED_IAM \
     --parameter-overrides SiteStackName=gethired-site HostedZoneId=<ZONE_ID>
   ```

2. Create an access key for the `gethired-site-deploy` user and store it in GitHub secrets.

## GitHub configuration

| Kind | Name | Value |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` | from step 2 |
| Secret | `AWS_SECRET_ACCESS_KEY` | from step 2 |
| Variable | `AWS_REGION` | `us-east-1` |
| Variable | `STACK_NAME` | `gethired-site` (lowercase) |
| Variable | `DOMAIN_NAME` | apex domain, e.g. `example.com` |
| Variable | `HOSTED_ZONE_ID` | Route53 zone for that domain |

## Running it

Run the workflow once via **Actions > Deploy site > Run workflow** to confirm the `infra`
job reaches `CREATE_COMPLETE` (first CloudFront distribution takes ~5-20 min), then push to
the `infra` branch.

## Switching the deploy branch to `master`

One line in `.github/workflows/deploy.yml`: `branches: [infra]` -> `branches: [master]`.
If you have applied `oidc.yaml`, update its `Branch` parameter too.

## Migrating to OIDC

Apply `bootstrap/oidc.yaml` (`DeployPolicyArn` is an output of the bootstrap stack), add an
`AWS_ROLE_ARN` variable, replace the two `AUTH BLOCK` steps in the workflow with
`role-to-assume`, add `permissions: id-token: write`, then delete the IAM user's access keys.

## Adding `www`

Add `www.<domain>` to the certificate (`SubjectAlternativeNames`), to the distribution
`Aliases`, and a second `AWS::Route53::RecordSet`. Nothing is hardcoded to the apex.

## Growth path

For the chatbot, add `main.yaml`, convert `site.yaml` into a nested stack, and deploy with
`aws cloudformation package` using the staging bucket from the bootstrap stack.
