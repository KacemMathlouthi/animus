# Security Policy

## Reporting a vulnerability

Do not open a public issue for a security problem.

Report it privately through
[GitHub Security Advisories](https://github.com/KacemMathlouthi/animus/security/advisories/new),
or email **security@tryanimus.app**.

Useful things to include:

- What the issue is and roughly how bad you think it is.
- Steps to reproduce, or a proof of concept.
- Which part it affects: the hosted service at tryanimus.app, the code in this
  repository, or both.

You will get an acknowledgement within a few days. animus is maintained by one
person, so please allow reasonable time for a fix before disclosing publicly.
You will be credited in the advisory unless you would rather not be.

## Scope

In scope:

- The hosted service at `tryanimus.app` and its API.
- Anything in this repository, including the agent's tools and the sandbox
  boundary.

Out of scope:

- Third party services animus is built on (Daytona, Neon, Cloudflare R2, Amazon
  Bedrock, ElevenLabs, Exa, Resend, Vercel). Report those to the vendor.
- Findings from automated scanners with no demonstrated impact.
- Denial of service through sheer volume.
- Social engineering of the maintainer or of users.

Please do not run tests that degrade the service for other people, and do not
access, modify or retain data that is not yours. Use your own account. If you
reach someone else's data by accident, stop and report it.

## What the agent can do, by design

Worth knowing before reporting: animus gives a language model a shell and file
tools inside a per conversation cloud sandbox. Writing files, installing
packages and running commands in that sandbox is the product working as
intended, not a vulnerability.

What is in scope is anything that escapes that boundary: reaching another user's
sandbox, conversation, videos or credits, extracting platform credentials, or
getting the sandbox to act on the API or database.

## If you self host

The MIT license means you can run your own instance, and if you do, its security
is yours. A few things carry real consequences:

- `ENCRYPTION_KEY` protects stored provider keys with AES-256-GCM. Losing it
  makes stored keys unrecoverable. Leaking it exposes them.
- Provider credentials in the API's environment are spending credentials.
- Sandboxes execute model authored code with network access. Treat them as
  untrusted and give them credentials scoped to what a render actually needs.
