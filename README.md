# Portfolio Websit

## Goal
Display Skills:
* AWS - architecture
* Research and Development (R&D)
* CI/CD - GitHub Actions
* Reinforcement Learning
* Machine Learning

Learn:
* Terraform
* GenAI

## Build status

Version 1 (Inactive) frontend lives in [`frontend/`](./frontend) — a static
Next.js site that builds to `out/` for S3 hosting. See
[`frontend/README.md`](./frontend/README.md) to run it, and
[the design spec](./docs/superpowers/specs/2026-09-10-portfolio-frontend-v1-design.md)
for what it does and does not cover. AWS infrastructure is not built yet.

## Functionalities
### Version - 1 (Inactive)
* Basic Portfolio
* Route 53
* S3
* CloudFront

### Version - 2 (Planned but more research needed)
* Comments Section
    * Lambda Backend
    * RDS postgres database (or dynamoDB) (vectorDB)
    * Bedrock
    * SQS
    * API Gateway
    * Rate limits
    * Hard limits on API and Database
    * Text Classification (Negative comments removal and profanity filter)

* Chatbot
    * Hugging Face
    * RAG
    * Bedrock
    * Posiibly EC2
    * Lambda Backend
    * RDS postgres database (vectorDB)
    * Bedrock
    * API Gateway
    * Hard Limits on LLM and API
    * Rate Limits

* TODO:
Research more about security and tighten for misuse.