# ACPP — Product Definition

> **Give agents an identity, not just an API key.**

**Product:** ACPP  
**Working name:** Agent Communication per Protocol  
**Domain:** acpp.ai  
**Category:** AI Agent Identity, Trust, Signaling & Authorization Infrastructure  
**Document type:** Product vision, requirements, architecture principles and implementation roadmap  
**Status:** Foundational product specification  
**Version:** 1.0

---

## 1. Executive Summary

AI agents are becoming independent actors in software systems. They can read information, call tools, communicate with other agents, make decisions, and execute actions on behalf of people and organizations.

However, the infrastructure surrounding them is fragmented.

An agent may have an API key, a set of MCP connections, access to several applications, and a system prompt defining its behavior. These pieces do not, by themselves, provide a universal way to answer fundamental questions:

- Who or what is this agent?
- Who controls it?
- How can another agent discover and address it?
- What is it capable of doing?
- Which actions has it been authorized to perform?
- Can a recipient verify the origin and integrity of a message?
- How can a user revoke an agent's permissions?
- How can an action be traced back to the signal, identity, policy, and authorization that permitted it?

ACPP aims to establish an interoperable infrastructure layer for answering these questions.

The product combines a protocol specification with a practical service that makes the protocol usable by developers, organizations, people, and autonomous agents.

At its core, ACPP provides:

1. **Identity** — stable, verifiable identities and addresses for agents, people, and services.
2. **Discovery** — a controlled way to find an entity and learn what it can do.
3. **Signals** — a standard envelope for communicating events, requests, offers, intents, and other machine-readable messages.
4. **Trust** — verifiable identity, provenance, and explicit trust relationships.
5. **Consent and authorization** — enforceable rules governing who can request which actions, under what conditions.
6. **Intent and action** — a structured distinction between requesting an outcome and actually executing it.
7. **Receipts** — verifiable records of delivery, decisions, authorization, and execution outcomes.
8. **Connectivity** — integrations with existing tools and protocols, including MCP, without requiring every application to build its own integration infrastructure.

ACPP is not intended to become another general-purpose AI assistant, messaging application, MCP server marketplace, or agent orchestration platform.

It should become the identity and authorization layer that allows independent agents to interact safely across application boundaries.

### Product thesis

As agents become more autonomous, identity and permissions must become properties of the infrastructure rather than conventions hidden inside individual applications.

**The internet gave services addresses. ACPP aims to give agents verifiable identities, controlled communication, and accountable action.**

---

## 2. The Problem

### 2.1 Identity is fragmented

Today, an agent's identity is often represented by an application-specific user ID, API key, OAuth token, service account, or provider-specific identifier.

These credentials serve different purposes and do not necessarily establish a portable, verifiable identity for the agent itself.

An agent that operates across multiple systems may need separate registrations, credentials, and permissions everywhere it goes.

This creates duplicated setup, inconsistent policies, and difficult-to-audit access.

### 2.2 Communication lacks a common identity layer

Different tools and agent frameworks use different communication conventions.

A system may support webhooks, REST APIs, message queues, MCP, or a proprietary agent-to-agent protocol.

Transport compatibility does not automatically establish who sent a message, whether the sender is authorized, or what the recipient is permitted to do in response.

ACPP should provide a consistent identity and authorization model that can work across these different transports.

### 2.3 Connectivity is repetitive

Developers frequently need to configure integrations separately for each application, agent, environment, or workflow.

Consider a team using GitHub, Linear, Slack, Sentry, and internal APIs.

Every new agent may need a combination of:

- Tool discovery.
- OAuth authorization.
- Credential management.
- Permission configuration.
- Connection setup.
- Audit logging.
- Revocation and rotation.

A shared connectivity layer can reduce duplication, but centralized connectivity alone is not enough. It must also know which identity is requesting access, why access is needed, and what policy governs the request.

### 2.4 Permissions are too coarse

A credential may grant access to an entire service when the agent only needs one narrowly defined capability.

For example, an agent investigating a production incident may need to read Sentry issues and query deployment history, but it should not automatically receive permission to modify production infrastructure.

ACPP should support least-privilege authorization, bounded delegation, expiration, and explicit approval for sensitive actions.

### 2.5 Autonomous actions are difficult to verify

When an agent receives a message and acts on it, the resulting action may be separated from the original event, the sender's identity, and the policy that authorized the action.

This makes debugging, accountability, and incident investigation harder.

ACPP should connect the chain:

**Signal → Identity Verification → Policy Evaluation → Authorization → Action → Receipt**

The chain must be observable and auditable without assuming that every agent is trustworthy.

---

## 3. Vision

Create an interoperable identity and communication infrastructure for a world where humans, services, and AI agents interact as independent digital actors.

An ACPP-enabled actor should be able to:

- Establish a verifiable identity.
- Publish selected capabilities.
- Receive messages at a stable address.
- Discover other actors through authorized mechanisms.
- Exchange structured signals.
- Request access or delegated authority.
- Evaluate whether a requested interaction is permitted.
- Execute an action through an appropriate integration.
- Produce evidence of what happened.
- Revoke trust and access when circumstances change.

The experience should feel simple to developers while enforcing a rigorous security model underneath.

### Long-term vision

A user should eventually be able to maintain one personal agent identity and authorize that agent to interact with other people, services, and agents without manually configuring every integration in every application.

A company should be able to register organizational agents, delegate limited authority, and govern their interactions through consistent policies.

A developer should be able to integrate ACPP without adopting a particular agent framework, model provider, cloud provider, or orchestration product.

---

## 4. Product Positioning

### Primary positioning

**Identity and authorization infrastructure for AI agents.**

Supporting message:

**Give agents an identity, not just an API key.**

Additional messaging directions:

- One identity. Controlled access. Verifiable actions.
- A trust layer for agent-to-agent interactions.
- Connect agents without surrendering control.
- Identity, permissions, and communication for autonomous systems.

### What ACPP is

- An identity protocol and associated implementation.
- A registry and discovery mechanism with explicit visibility rules.
- A structured signal exchange protocol.
- An authorization and delegation layer.
- An audit and receipt infrastructure.
- A connectivity layer that can integrate with existing tools and protocols.

### What ACPP is not

- A new foundation model.
- A general-purpose chatbot.
- A replacement for MCP.
- A replacement for OAuth, TLS, or existing identity standards.
- A centralized store for every credential used by every agent.
- A cryptocurrency, token, or blockchain-dependent identity system.
- A promise that verified identities are inherently trustworthy.
- An autonomous execution engine that can bypass application permissions.
- A claim that every agent should be publicly discoverable.

ACPP must complement existing infrastructure rather than force developers to replace it.

---

## 5. Core Design Principles

### 5.1 Identity is not authority

Knowing who an agent is does not mean it should be allowed to perform an action.

Every protected action must be evaluated against an explicit authorization policy.

### 5.2 Discovery is not consent

Discovering an agent or its capabilities does not grant permission to send it arbitrary requests, access its data, or trigger its actions.

### 5.3 A signal is not an instruction to execute

Receiving a signal must not automatically authorize the requested action.

Signals are inputs to policy evaluation, not a mechanism for bypassing it.

### 5.4 Least privilege by default

Agents receive only the permissions required for their intended task.

Permissions should be narrow, scoped, time-bounded where appropriate, and revocable.

### 5.5 The user remains in control

Users and organizations must be able to inspect grants, configure approval requirements, revoke access, and disable an agent's ability to act.

### 5.6 Interoperability over lock-in

The core protocol must be usable independently of the hosted ACPP service.

Implementations should support documented schemas, standard cryptographic primitives, and well-defined extension points.

### 5.7 Security must be enforceable

Policies cannot be merely descriptive text supplied to an LLM.

Authorization decisions must be enforced by a trusted runtime or service boundary.

### 5.8 Privacy by design

Public identity information must be separated from private profile data, credentials, messages, and personal information.

### 5.9 Observable by default

Every security-sensitive decision should have a structured record with sufficient provenance for auditing and investigation.

### 5.10 Start with a narrow, valuable use case

The first release should solve a real identity, authorization, and connectivity problem end to end rather than attempt to implement an entire agent ecosystem.

---

## 6. Actors and Identity Model

ACPP must distinguish between an entity, the credentials used to authenticate it, and the authority it has been granted.

### 6.1 Actor types

**Human**

A person who owns an identity, controls an agent, receives requests, or approves actions.

**Agent**

An autonomous or semi-autonomous software entity acting within a defined scope.

**Service**

A non-agent software service that sends events, provides capabilities, or participates in workflows.

**Organization**

An entity that owns identities, establishes policies, and manages delegation.

**Application**

A client application that uses ACPP to authenticate, discover identities, exchange signals, or request authorization.

An actor may be associated with an organization and may control other actors without sharing the same identity.

### 6.2 Agent Address

Each registered entity should receive a stable, globally unique identifier.

Working examples:

- `acpp:agent:01J...`
- `acpp:human:01J...`
- `acpp:service:01J...`
- `acpp:org:01J...`

These are illustrative identifiers, not a finalized URI standard.

The user-facing product may provide a human-readable handle such as `@research-agent`, but handles must not be the security identity.

Handles may change. Stable identifiers must not silently transfer to a different owner or identity.

### 6.3 Identity record

A minimal identity record may contain:

- Stable identifier.
- Actor type.
- Display name.
- Public verification material or a reference to it.
- Issuer or registration authority, where applicable.
- Controller or organizational relationship.
- Published capability references.
- Visibility and discovery settings.
- Creation and lifecycle status.
- Verification status and relevant timestamps.

Private credentials, personal information, secret keys, and access tokens must never appear in public identity records.

### 6.4 Identity lifecycle

The protocol and hosted service should support:

1. Registration.
2. Key enrollment.
3. Identity verification.
4. Capability publication.
5. Credential rotation.
6. Suspension.
7. Recovery through a defined ownership process.
8. Revocation or retirement.

An identity should not silently become a different identity because its owner changes a key or display name.

### 6.5 Identity verification

ACPP must distinguish several independent claims:

- The sender controls a particular cryptographic key.
- The key is associated with a registered identity.
- The identity is controlled by a particular user or organization.
- The identity has a particular capability.
- The identity is authorized to perform a specific action.
- The identity has a history of successfully completed interactions.

These claims require different evidence. A successful cryptographic signature proves neither benevolent intent nor permission to execute an action.

---

## 7. Protocol Architecture

ACPP should be designed as a modular protocol rather than a monolithic application.

Its conceptual architecture has seven layers.

### Layer 1 — Identity

Establishes stable identifiers, cryptographic proof of control, key rotation, ownership relationships, and lifecycle management.

### Layer 2 — Discovery

Allows authorized clients to resolve identities, inspect public or permissioned capability descriptions, and determine how to reach an actor.

### Layer 3 — Signal

Defines a transport-independent envelope for events, requests, offers, notifications, responses, and other structured messages.

### Layer 4 — Trust

Provides mechanisms to express and verify identity relationships, issuer claims, provenance, and other evidence used in trust decisions.

Trust relationships must be explicit and must not imply automatic permission.

### Layer 5 — Intent and authorization

Represents the requested outcome, evaluates the applicable policy, and produces a decision before protected actions can occur.

### Layer 6 — Action

Connects authorized requests to actual execution through an agent runtime, tool adapter, API, or MCP integration.

ACPP does not need to execute every action itself. It must define the authorization boundary and preserve the link between a request and its execution.

### Layer 7 — Receipt

Records the outcome of signal delivery, verification, policy evaluation, approval, and execution.

Receipts must distinguish a message being accepted from an action being completed successfully.

---

## 8. Signal Protocol

Signals are the primary communication primitive of ACPP.

A signal is a structured, attributable message sent by one actor to another actor or a defined audience.

### 8.1 Signal categories

The initial protocol should support a small number of extensible categories.

**Event**

Something happened.

Examples: a deployment completed, a ticket changed, or a monitoring alert fired.

**Request**

An actor requests an outcome.

Examples: summarize an incident, investigate a repository, or prepare a report.

**Offer**

An actor makes a capability or resource available.

Examples: an agent offers to analyze a document or a service advertises a supported operation.

**Response**

An actor responds to a previous request.

Examples: an investigation result, an authorization response, or a clarification request.

**Approval**

An authorized actor explicitly approves or rejects a protected operation.

**Revocation**

An actor or authority invalidates a credential, grant, delegation, or other previously valid authorization.

### 8.2 Signal envelope

A signal should contain the following logical fields:

- Protocol version.
- Unique signal identifier.
- Signal type.
- Sender identity.
- Recipient or audience.
- Creation timestamp.
- Expiration or validity information where relevant.
- Correlation identifier.
- Reply-to or causation reference where relevant.
- Content type.
- Payload.
- Integrity and authentication evidence.
- Optional delivery and processing requirements.

The exact wire format must be versioned and specified separately from the product UI.

### 8.3 Security requirements

The protocol must define:

- Canonical serialization for signed messages.
- Sender authentication.
- Message integrity verification.
- Replay protection.
- Expiration semantics.
- Audience restrictions.
- Correlation and idempotency behavior.
- Delivery acknowledgement semantics.
- Safe handling of unknown signal types.
- Maximum payload size and validation rules.

Signatures must cover the security-relevant envelope fields, not just the payload.

Transport encryption and message signatures solve different problems. ACPP must not treat either as a substitute for authorization.

### 8.4 Delivery semantics

The protocol should not promise universal exactly-once delivery.

Implementations should support retry-safe processing, duplicate detection, and explicit acknowledgement states.

Where an action has side effects, idempotency keys and action-level deduplication should prevent ordinary delivery retries from causing duplicate operations.

### 8.5 Signal handling

A recipient should be able to:

1. Authenticate the sender.
2. Validate the message structure and integrity.
3. Verify the recipient and validity window.
4. Check replay and duplicate conditions.
5. Evaluate sender permissions and signal-specific policies.
6. Accept, reject, defer, or request clarification.
7. Invoke an authorized handler if necessary.
8. Record a receipt.

An LLM may help interpret payloads, but it must not be the final authority for security-critical decisions.

---

## 9. Trust and Authorization

Trust is not a single score.

ACPP should avoid reducing identity, reputation, ownership, authorization, and behavioral history into one opaque trust number.

### 9.1 Authorization model

Authorization decisions should evaluate:

- Who is requesting the action?
- Who controls the requesting identity?
- What resource is being accessed?
- Which operation is requested?
- On whose behalf is the request made?
- What delegated authority exists?
- What policy applies?
- What is the purpose or context of the request?
- Is human approval required?
- Has the permission expired or been revoked?
- Does the operation exceed any configured limits?

### 9.2 Permission model

The protocol should support action-level grants.

Illustrative permissions:

- `signals:receive`
- `signals:send`
- `identity:resolve`
- `capabilities:read`
- `github:issues:read`
- `github:pull_requests:create`
- `deployments:read`
- `deployments:execute`

These are examples, not final standardized permission names.

Permissions must be scoped to the applicable actor, resource, environment, and operation.

### 9.3 Delegation

A human or organization may delegate limited authority to an agent.

A delegation should define:

- The delegator.
- The delegate.
- The permitted actions.
- The relevant resources.
- The scope of authority.
- Expiration.
- Whether further delegation is allowed.
- Approval requirements.
- Revocation behavior.

A delegate must never receive more authority than the delegator possesses.

The implementation must prevent privilege escalation through nested delegation.

### 9.4 Approval policies

Support at least three policy modes:

**Automatic**

A request may proceed if all configured policy conditions are satisfied.

**Approval required**

A designated human or authority must approve the request before execution.

**Denied**

The operation is prohibited, regardless of the agent's recommendation.

Approval must be bound to a specific action or immutable representation of the request. A materially changed action must be authorized again.

### 9.5 Revocation

Revocation must be a first-class capability.

The system should support revoking:

- Agent credentials.
- Delegated grants.
- Tool connections.
- Specific capability permissions.
- Identity publication.
- Pending requests.
- An agent's ability to initiate new actions.

Revocation cannot retroactively undo an action already completed. The product must clearly distinguish immediate access denial from the handling of in-flight operations and external side effects.

---

## 10. MCP and External Connectivity

ACPP should complement existing communication and integration standards.

MCP is a tool interoperability protocol. ACPP's role is to establish identity, permissions, and accountable communication around interactions.

### 10.1 Product objective

A developer should be able to configure a tool connection once and make it available to authorized agents without repeatedly configuring the same integration in each application.

The system should also allow an agent to discover which capabilities are available to it.

### 10.2 Central connectivity service

The hosted product should provide a managed catalog of tool connections, such as:

- GitHub.
- Slack.
- Linear.
- Sentry.
- Internal HTTP APIs.
- MCP servers.
- Selected database or infrastructure integrations.

Integration availability does not imply that all connectors must ship in the first release.

### 10.3 Connection model

Each connection should define:

- The connected service.
- The account or organization that owns the connection.
- Authentication method.
- Available operations.
- Allowed agent identities.
- Permission scopes.
- Environment restrictions.
- Rate limits and usage limits.
- Approval requirements.
- Credential expiration and rotation behavior.
- Audit settings.

Secrets must be encrypted at rest, excluded from logs, and never exposed directly to agents unless a narrowly defined integration explicitly requires it.

### 10.4 Dynamic tool discovery

An agent should not automatically receive the complete tool catalog.

The service should expose only the capabilities permitted by the agent's identity, task context, and policy.

Where useful, clients may request capability discovery at runtime.

Dynamic discovery must not bypass authorization or leak hidden tools through metadata.

### 10.5 MCP gateway behavior

The gateway should:

1. Authenticate the calling actor.
2. Resolve the requested connection.
3. Check the actor's authorization.
4. Validate the requested tool and arguments.
5. Apply rate limits and approval policies.
6. Execute the operation using the appropriate connection.
7. Record the request and outcome.
8. Return a sanitized result.

The gateway must preserve the distinction between the agent's identity and the credentials of the connected account.

### 10.6 Security boundary

A centralized gateway is a high-value security boundary and a potential high-impact failure point.

The architecture must account for tenant isolation, credential isolation, least-privilege scopes, request signing where appropriate, SSRF protection, connector allowlists, secret redaction, rate limiting, and comprehensive audit logging.

For remote MCP servers, the implementation must validate server identity and connection security and must not blindly trust a server merely because it is registered.

### 10.7 MCP host adapters (Claude, Cursor, and peers)

Without a thin adapter that major agent hosts can install, ACPP stays an HTTP/SDK-only control plane and is effectively unusable for developers who already work inside Claude Desktop, Cursor, and similar tools.

ACPP must therefore expose itself as an **MCP server** those hosts can add (stdio and/or SSE), while preserving the same identity, grant, approval, credential-isolation, and receipt path as the hosted gateway.

Product requirements:

1. A developer can register an agent identity, connect a tool once in ACPP, grant scoped access, then add ACPP to Claude Desktop or Cursor via a short MCP config (`mcp.json` or equivalent).
2. Tools advertised to the host are **policy-permitted capabilities only** (discovery ≠ consent; §10.4).
3. Every consequential host-initiated tool call is authenticated as the agent actor, evaluated against grants, optionally approval-bound, executed via the connection credential ref, and linked on a receipt.
4. The adapter is not a marketplace, not a Cursor/Claude product clone, and not a replacement for MCP — it is the host-facing surface of the existing gateway (§10.5).
5. First targets: **Claude Desktop** and **Cursor**. Additional MCP-capable hosts may follow the same contract without per-host protocol forks.

This host path is adoption-critical: protocol and dashboard value must be reachable from the tools developers already use daily.

---

## 11. Core Product Experience

The hosted ACPP application should make the protocol understandable and usable without requiring users to learn every implementation detail.

### 11.1 Main navigation

The initial product experience should be organized around:

**Overview**

A summary of identities, recent signals, active grants, pending approvals, and security events.

**Identities**

Manage human, agent, service, and organization identities.

**Connections**

Register external services and MCP servers, configure authentication, and manage access.

**Signals**

Inspect incoming and outgoing signals, delivery states, and processing results.

**Permissions**

Review grants, delegation, approval policies, expiration, and revocation.

**Receipts & Audit**

Investigate authorization decisions, execution history, and related evidence.

**Developers**

Access API credentials, protocol documentation, SDK examples, webhook configuration, and integration settings.

These sections describe the product information architecture, not a requirement to build every section in the MVP.

### 11.2 First-time experience

The onboarding flow should demonstrate the product's core value as quickly as possible.

1. Create an account or authenticate using a supported identity provider.
2. Create a workspace.
3. Register the first agent identity.
4. Establish its verification credentials.
5. Connect one supported tool.
6. Grant a narrowly scoped permission.
7. Send a test signal or make a test request.
8. Observe the authorization decision and resulting receipt.

The user should understand exactly which identity acted, which connection was used, what was authorized, and what happened.

### 11.3 Identity detail page

Each identity should have a focused detail page containing:

- Identity identifier and display name.
- Actor type and owner.
- Verification status.
- Published capabilities.
- Active and expired permissions.
- Connected services.
- Recent signals.
- Recent authorization decisions.
- Receipts and security events.
- Credential lifecycle controls.
- Suspend and revoke actions.

Sensitive information must not be displayed merely because a user can open an identity detail page. Every view and operation must respect workspace roles and field-level visibility requirements.

### 11.4 Connection setup

Connection setup should be explicit and understandable.

The UI must show:

- Which external account is being connected.
- Which permissions are requested.
- Which agents can use the connection.
- Which operations are available.
- Which operations require approval.
- Whether access is read-only or allows modifications.

Never hide broad permissions behind a generic “Connect” button.

### 11.5 Signal inspector

The signal inspector should display:

- Sender and recipient.
- Signal type.
- Verification result.
- Timestamp and expiration.
- Correlation with other signals.
- Authorization decision.
- Processing status.
- Action outcome.
- Related receipt.

Raw payloads may contain sensitive information and must be subject to access controls and redaction.

### 11.6 Approval inbox

Users should be able to review pending requests with enough context to make an informed decision.

An approval request must show:

- The requesting identity.
- The requested action.
- The target resource.
- The reason and relevant context.
- The exact permissions being exercised.
- Any material risks or irreversible side effects.
- The expiration time.
- The applicable policy.

The interface must not make approval appear equivalent to a harmless notification.

---

## 12. Primary Use Cases

### Use Case A — An agent receives a signal

A monitoring service detects an incident and sends a signal to an incident-response agent.

The recipient verifies the sender, validates the message, evaluates the applicable policy, and decides whether the signal may be processed.

If authorized, the agent can investigate the incident using its permitted tools.

The result is recorded in a receipt linked to the original signal.

### Use Case B — An agent discovers another agent

A research agent needs a capability that another agent provides.

It resolves the other agent's identity through an authorized discovery mechanism, inspects its published capabilities, and sends a request.

Discovery does not grant access to private data or permission to invoke every advertised capability.

### Use Case C — An agent requests a protected action

An agent requests permission to create a pull request or execute a deployment.

ACPP evaluates the identity, delegated authority, requested operation, environment, and applicable policy.

The action either proceeds, requires approval, or is denied.

The decision and result are recorded for later investigation.

### Use Case D — One integration serves multiple agents

A company connects GitHub once to its workspace.

Two agents receive different permissions: one can read issues, while the other can create pull requests but cannot modify repository settings.

Both use the same managed connection without sharing the underlying GitHub credential.

### Use Case E — A user delegates limited authority

A user authorizes a personal agent to handle a defined category of requests.

The grant has a scope, expiration, and approval rules.

The agent cannot extend its own authority or delegate more privileges than it received.

### Use Case F — A user revokes access

A user disables an agent that should no longer interact with a connected service.

ACPP denies new protected operations under the revoked grant, handles in-flight work according to defined safety semantics, and records the revocation.

The interface makes clear which external actions have already completed and cannot be automatically undone.

---

## 13. MVP Scope

The first release must demonstrate a complete, trustworthy workflow rather than a broad collection of incomplete protocol features.

### 13.1 MVP objectives

Prove that a developer can:

1. Create a verifiable agent identity.
2. Register and manage one external connection.
3. Send and receive a structured signal.
4. Authenticate the sender.
5. Enforce explicit permissions.
6. Require approval for a protected action.
7. Execute an authorized operation.
8. Inspect a receipt linking the request to the decision and outcome.
9. Revoke access and verify that subsequent requests are denied.

### 13.2 Required capabilities

**Identity**

- Agent registration.
- Stable identifiers.
- Key-based sender verification.
- Key rotation and suspension.
- Ownership and workspace relationships.

**Signals**

- Versioned message envelope.
- Authenticated signal delivery.
- Recipient validation.
- Replay protection.
- Correlation identifiers.
- Delivery and processing status.
- Idempotent handling.

**Authorization**

- Explicit permission grants.
- Resource and operation scopes.
- Expiring grants.
- Approval-required policies.
- Denial policies.
- Revocation.

**Connectivity**

- One production-quality connector, initially GitHub or another integration that best validates the first user workflow.
- A documented MCP integration path.
- Credential isolation.
- Per-agent access policies.
- A documented path to install ACPP as an MCP server in Claude Desktop and Cursor (host adapter; may land as early Phase 2 if Phase 1 wedge proof is still open).

**Receipts**

- Signal receipt.
- Verification result.
- Authorization decision.
- Approval record where applicable.
- Execution result.
- Correlation across the complete workflow.

**Dashboard**

- Workspace overview.
- Identity management.
- Connection management.
- Permissions and approvals.
- Signal inspection.
- Receipt and audit history.

**Developer experience**

- HTTP API.
- Machine-readable protocol schemas.
- SDK or reference client.
- Quickstart guide.
- Local development environment.
- Example end-to-end integration.
- MCP host install docs for Claude Desktop and Cursor (config snippet + allow/deny proof).

### 13.3 Explicitly out of scope for MVP

- A complete end-user messaging application.
- A universal consumer personal assistant.
- Every possible MCP connector.
- A public marketplace for agents.
- Cryptocurrency or token-based incentives.
- A global reputation scoring system.
- Fully autonomous, unrestricted delegation.
- Arbitrary cross-agent execution without policy checks.
- A custom foundation model.
- A universal decentralized identity network.
- A new replacement for OAuth or MCP.
- Complex multi-agent orchestration and workflow building.
- Claims of end-to-end encrypted private messaging unless a separately specified and verified messaging design is implemented.

These exclusions preserve focus on the foundational product value.

---

## 14. Technical Architecture

The implementation should favor a modular monolith initially, with clear domain boundaries and independently testable components. Distributed services should be introduced only when justified by scale, security isolation, or operational requirements.

### 14.1 Logical components

**Identity Service**

Owns identity records, public verification material, key lifecycle, and ownership relationships.

**Discovery Service**

Resolves identifiers and returns authorized identity and capability information.

**Signal Gateway**

Validates and routes incoming signals, applies delivery controls, and coordinates acknowledgements.

**Policy Engine**

Evaluates authorization requests against explicit, deterministic policy rules.

**Approval Service**

Manages pending approvals, approver authority, decision records, expiration, and action binding.

**Connection Manager**

Manages external integrations, connection metadata, credentials, and access scopes.

**Execution Adapter**

Calls the selected tool or external service only after authorization requirements are satisfied.

**Receipt and Audit Service**

Records structured evidence of verification, policy evaluation, approvals, execution, and revocation.

**Developer API**

Exposes the supported public API and protocol endpoints.

**Dashboard**

Provides the human-facing workspace for identities, connections, permissions, signals, and audit.

### 14.2 Architectural invariants

The following must remain true regardless of implementation choices:

1. Identity verification is distinct from authorization.
2. Authorization is evaluated by a trusted component.
3. An agent cannot grant itself additional privileges.
4. The client cannot override a server-side denial.
5. External credentials are not exposed to unauthorized agents.
6. Every protected execution is associated with an authorization decision.
7. Sensitive operations cannot be approved using a stale or materially changed request.
8. Tenant boundaries are enforced server-side.
9. Revocation prevents new operations under the revoked grant.
10. Receipts never falsely imply that an external action succeeded when its outcome is unknown.

### 14.3 Suggested implementation stack

The product should not depend on a specific stack at the protocol level.

For the hosted implementation, a reasonable starting architecture is:

- **API:** TypeScript with a mature HTTP framework.
- **Database:** PostgreSQL.
- **Background processing:** A durable queue or PostgreSQL-backed job mechanism.
- **Credentials:** Managed secret storage and encryption using established cloud KMS facilities.
- **Identity cryptography:** Standardized signing and verification libraries.
- **Web application:** React with TypeScript.
- **Observability:** Structured logs, metrics, traces, and security audit events.
- **Deployment:** Containerized services with environment-specific configuration.

These are implementation recommendations, not mandatory protocol dependencies. Existing team expertise may justify different choices.

### 14.4 Persistence model

The initial data model should include the following logical entities:

- `Workspace`
- `Actor`
- `IdentityKey`
- `OwnershipRelationship`
- `Capability`
- `Signal`
- `SignalDelivery`
- `Connection`
- `ConnectionCredentialReference`
- `PermissionGrant`
- `Delegation`
- `AuthorizationDecision`
- `ApprovalRequest`
- `Execution`
- `Receipt`
- `AuditEvent`

Every tenant-owned record must have explicit ownership and access rules.

Credential values must not be stored in ordinary application tables in plaintext. Database records should reference protected secret material held by an appropriate secrets system.

### 14.5 Reliability

The system should handle duplicate requests, transient failures, expired credentials, downstream timeouts, and partially completed workflows.

For every external execution, the product must distinguish:

- Not started.
- Authorized.
- Awaiting approval.
- Running.
- Succeeded.
- Failed.
- Rejected.
- Cancelled.
- Outcome unknown.

The `outcome unknown` state is essential when a remote service may have completed an operation even though the response was lost.

The system must not automatically repeat a potentially non-idempotent operation merely because its outcome is uncertain.

---

## 15. Security and Privacy Requirements

Security is a core product capability, not a later hardening phase.

### 15.1 Authentication

- Verify signed messages using supported cryptographic algorithms.
- Bind credentials to the intended identity and usage.
- Support key rotation and revocation.
- Prevent replay of authenticated messages.
- Validate timestamps and audience restrictions.
- Define secure enrollment and recovery flows.

### 15.2 Authorization

- Deny by default when no applicable grant exists.
- Enforce permissions on the server.
- Validate every protected operation independently.
- Prevent cross-tenant access.
- Support short-lived authorization where appropriate.
- Bind approvals to exact requests.
- Reject expired, revoked, or out-of-scope grants.

### 15.3 Credential protection

- Encrypt credentials at rest.
- Use TLS for network communication.
- Redact credentials from logs and traces.
- Restrict secret access to the connection execution boundary.
- Never place secret material in prompts, ordinary signal payloads, public identity records, or receipts.
- Support credential rotation and connection revocation.

### 15.4 Threat model

The initial threat model must consider:

- A malicious agent with a valid identity.
- A compromised agent signing key.
- A malicious or compromised MCP server.
- Forged signals and replay attacks.
- Prompt injection through incoming signals or tool output.
- Unauthorized delegation and privilege escalation.
- Cross-tenant data exposure.
- SSRF and malicious connector endpoints.
- Credential theft.
- Approval phishing and request substitution.
- Duplicate execution and retry failures.
- Audit-log tampering.
- Abuse of discovery and signal delivery.
- Denial-of-service attacks and excessive tool usage.

### 15.5 Prompt injection boundary

Signals and external tool results must be treated as untrusted data, even when their senders have valid identities.

A verified sender can still send malicious instructions.

LLMs may interpret untrusted content, but sensitive operations must remain subject to deterministic authorization, schema validation, and applicable approval rules.

### 15.6 Audit integrity

Audit records should be append-oriented, access-controlled, and protected against ordinary application-level modification.

For higher assurance, the architecture may later introduce cryptographic hash chaining, external timestamping, or independently retained audit exports.

Cryptographic audit mechanisms must be designed and verified rather than presented as guarantees merely because records are signed.

### 15.7 Privacy

- Collect only the data needed for the requested interaction.
- Separate public identity information from private profile information.
- Make discovery visibility configurable.
- Minimize payload retention.
- Define retention and deletion policies.
- Avoid exposing sensitive payloads in logs.
- Restrict audit visibility to authorized users.
- Document what information is shared with connected services.

ACPP should not claim end-to-end encryption for messages unless the architecture actually provides it, including a clearly specified key-management model and protected content at every relevant endpoint.

---

## 16. API and Protocol Design

The public API should be resource-oriented, versioned, and documented independently of the dashboard.

Illustrative endpoints:

```http
POST /v1/identities
GET  /v1/identities/{identity_id}
GET  /v1/identities/{identity_id}/capabilities

POST /v1/signals
GET  /v1/signals/{signal_id}
GET  /v1/signals/{signal_id}/receipt

POST /v1/connections
GET  /v1/connections
POST /v1/connections/{connection_id}/test

POST /v1/authorization/evaluate
POST /v1/approvals/{approval_id}/decide

GET  /v1/grants
POST /v1/grants
POST /v1/grants/{grant_id}/revoke

GET  /v1/receipts/{receipt_id}
```

These endpoint names are proposed examples and should be refined during API design.

### 16.1 API requirements

- Explicit API versioning.
- Stable error codes.
- Structured validation errors.
- Pagination and filtering.
- Request correlation identifiers.
- Idempotency support for operations with side effects.
- Rate limiting.
- Consistent authentication.
- Documented permission requirements.
- Backward-compatibility policy.
- OpenAPI documentation for the hosted API.

### 16.2 Protocol versus service

The protocol should specify message structures, verification rules, authorization semantics, and interoperability requirements.

The hosted ACPP service provides identity management, connection management, policy enforcement, signal routing, and audit interfaces.

A customer should be able to understand which capabilities depend on ACPP's hosted service and which are part of the portable protocol.

The protocol must not silently make the hosted ACPP service a mandatory dependency for every identity verification or communication flow.

---

## 17. Developer Experience

Developer adoption is a primary success factor.

### 17.1 Quickstart

A developer should be able to:

1. Create a workspace.
2. Register an agent.
3. Install or use the reference SDK.
4. Authenticate the agent.
5. Send a test signal.
6. Verify a received signal.
7. evaluate a permission.
8. Obtain a receipt.

The quickstart should include a runnable example and demonstrate a real policy denial as well as a successful operation.

### 17.2 SDK requirements

The first SDK should provide helpers for:

- Identity registration.
- Signing and verification.
- Signal construction and validation.
- Sending and receiving signals.
- Capability discovery.
- Authorization requests.
- Approval handling.
- Receipt retrieval.
- Safe error handling.

SDKs must not conceal important security decisions behind convenience methods that automatically approve or execute protected operations.

### 17.3 Documentation

Documentation should cover:

- Protocol overview.
- Identity model.
- Signal envelope.
- Cryptographic verification.
- Authorization and delegation.
- MCP integration.
- Connection setup.
- Approval workflows.
- Error handling.
- Security considerations.
- Local development.
- Production deployment.
- Versioning and compatibility.

---

## 18. Product Metrics

The product should optimize for successful, secure integrations rather than raw message volume.

### Activation

- Time from account creation to first registered identity.
- Time from identity creation to first verified signal.
- Time from first signal to first successful authorized action.
- Percentage of new workspaces completing the end-to-end quickstart.

### Adoption

- Active identities.
- Active connections.
- Number of integrations used by more than one authorized agent.
- Weekly active developers.
- Number of production integrations.

### Reliability

- Signal delivery success rate.
- Verification failure rate.
- Authorization evaluation latency.
- Successful execution rate.
- Duplicate side-effect rate.
- Receipt completeness.
- Percentage of workflows with an unknown outcome.

### Security

- Unauthorized actions successfully blocked.
- Revocation propagation time.
- Expired grants correctly rejected.
- Cross-tenant isolation test results.
- Percentage of protected actions with complete authorization evidence.
- Credential exposure incidents.

A high number of rejected signals is not necessarily a negative metric; it may indicate that enforcement is working. Metrics must distinguish malicious activity from legitimate configuration errors.

### North-star metric

**Weekly verified and policy-compliant agent interactions completed with a traceable outcome.**

This measures the core value delivered: agents interacting across system boundaries without losing identity, control, or accountability.

---

## 19. Competitive Differentiation

ACPP should not compete on the number of integrations alone.

Its differentiation should come from combining interoperable identity with authorization and signal-level accountability.

### Compared with API key managers

API key managers protect credentials.

ACPP additionally models agent identities, communication, capabilities, delegation, authorization decisions, and action receipts.

### Compared with MCP gateways

MCP gateways primarily manage access to tools and MCP servers.

ACPP aims to provide a portable identity and policy model that can also govern interactions outside MCP.

A gateway may be an implementation component of ACPP, but it is not the complete product.

### Compared with traditional identity providers

Traditional identity systems authenticate users, applications, and services and may provide sophisticated authorization capabilities.

ACPP must integrate with these systems rather than pretend their functionality does not exist.

Its differentiation is a purpose-built model for agent identities, capabilities, signal exchanges, delegated authority, and verifiable agent actions.

### Compared with agent frameworks

Agent frameworks provide runtime abstractions, tool execution, and orchestration.

ACPP should remain framework-independent and focus on shared infrastructure that can be consumed by different runtimes.

### Compared with agent marketplaces

A marketplace helps users discover or obtain agents.

ACPP's discovery mechanism is an identity and capability-resolution primitive, not a requirement to create a marketplace or public directory.

---

## 20. Business Model

The initial business model should align pricing with the value of governed connectivity and enterprise control.

### Developer tier

A free or low-cost tier for experimentation, local development, and small projects.

Possible limits:

- Number of identities.
- Number of connections.
- Signal volume.
- Audit retention.
- Advanced policy features.

### Team tier

For teams operating multiple agents and integrations.

Potential paid features:

- Shared connection management.
- Fine-grained permissions.
- Approval workflows.
- Longer audit retention.
- Team roles.
- Higher usage limits.

### Enterprise tier

For organizations with stronger governance and operational requirements.

Potential features:

- Organization-wide policies.
- SSO and SCIM integration.
- Custom retention policies.
- Advanced audit export.
- Private deployment options.
- Compliance-oriented controls.
- Dedicated support and service-level commitments.

### Pricing principles

- Do not charge merely for identity registration in a way that discourages interoperability.
- Avoid pricing that encourages customers to bypass authorization checks.
- Keep costs predictable for high-volume event-driven workloads.
- Make the pricing relationship between signals, executions, connected services, and audit retention explicit.

Pricing should be validated through customer interviews and observed usage rather than finalized before the core workflow is proven.

---

## 21. Go-to-Market Strategy

The initial audience should be developers and teams already building agentic systems.

### Initial customer profile

- Teams deploying AI agents into real software workflows.
- Developers maintaining several MCP connections.
- Companies that need controlled access to tools and internal services.
- Platform engineering teams building agent infrastructure.
- Startups building agent products that require delegation and auditing.

### Initial wedge

The most concrete entry point is:

**Register an agent, connect a tool once, authorize its access, and verify every consequential interaction.**

This is easier to demonstrate and evaluate than a broad claim to provide a universal agent identity network.

### Developer-led adoption

The first growth loop should be based on:

1. Clear protocol documentation.
2. A usable reference implementation.
3. A compelling end-to-end demo.
4. Open schemas and SDK examples.
5. Integrations with existing developer tools — especially installable MCP host adapters for Claude Desktop and Cursor (§10.7).
6. Reproducible security and authorization tests.
7. Practical tutorials showing why ordinary API keys are insufficient for multi-agent authorization.

### Open protocol and hosted product

A strategic option is to publish the core protocol specification and selected reference components openly while charging for managed infrastructure and advanced governance.

This is a proposed strategy, not a prerequisite for the first release.

The decision should account for maintenance costs, security review, ecosystem adoption, and the risk of creating a protocol that is too difficult to implement consistently.

---

## 22. Roadmap

### Phase 0 — Specification and validation

Goals:

- Define the identity model.
- Define the signal envelope.
- Specify signing and verification rules.
- Define authorization and delegation semantics.
- Establish the threat model.
- Build a reference end-to-end example.
- Interview developers using multiple agents and MCP integrations.

Exit criteria:

- A third-party developer can understand and implement the core flow.
- Security-critical behaviors are explicitly specified.
- The protocol distinguishes identity, trust, consent, and authorization.
- At least one realistic use case demonstrates value beyond a generic API gateway.

### Phase 1 — MVP

Goals:

- Implement identity registration and verification.
- Implement authenticated signal exchange.
- Implement a deterministic policy engine.
- Add one real external integration.
- Add approval and revocation.
- Produce traceable receipts.
- Deliver a minimal hosted dashboard and API.

Exit criteria:

- A protected action succeeds only with valid authorization.
- Invalid signatures, expired grants, and revoked permissions are rejected.
- The same integration can serve multiple agents with different permissions.
- Duplicate delivery does not cause duplicate protected side effects in the supported workflow.
- A developer can reproduce the complete workflow from documentation.

### Phase 2 — Developer platform

Goals:

- Improve SDK quality.
- Expand integration coverage.
- Add capability discovery.
- Improve delegated authorization.
- Add audit export.
- Introduce organization and team management.
- Harden operational reliability.
- Ship MCP host adapters so ACPP can be added to Claude Desktop and Cursor (and peers) without a custom HTTP client (§10.7).

Exit criteria:

- Multiple independent agent runtimes can integrate with the platform.
- Customers can manage permissions without custom code for every integration.
- Audit evidence supports real incident investigation.
- A developer can complete the wedge (identity → connect → grant → allow → revoke → deny) from Claude Desktop or Cursor after adding ACPP as an MCP server.

### Phase 3 — Interoperable agent network

Goals:

- Support interoperable identity resolution.
- Expand cross-organization identity verification.
- Improve discovery visibility controls.
- Support additional transports.
- Formalize protocol conformance tests.
- Enable independently operated compatible implementations.

Exit criteria:

- Independent implementations can exchange and verify signals.
- Trust and authorization semantics remain consistent across implementations.
- Discovery does not require exposing private identity information.

### Phase 4 — Advanced trust and delegation

Potential capabilities:

- Richer delegation chains.
- Policy federation.
- Portable capability attestations.
- Organization-to-organization trust relationships.
- Verifiable execution evidence.
- Advanced identity recovery.
- More sophisticated privacy-preserving discovery.

These capabilities must be justified by actual interoperability and customer needs rather than added solely to increase protocol complexity.

---

## 23. Acceptance Criteria

The product is not ready for a production-oriented MVP until the following criteria are demonstrably satisfied.

### Identity

- [ ] Every registered actor has a stable unique identifier.
- [ ] Identity verification does not depend solely on a display name or API key label.
- [ ] Invalid signatures are rejected.
- [ ] Key rotation and revocation are tested.
- [ ] Identity ownership and workspace boundaries are enforced.

### Signals

- [ ] Signals conform to a versioned schema.
- [ ] Sender and audience are validated.
- [ ] Replay attempts are rejected within the documented protection model.
- [ ] Expired messages are handled according to explicit policy.
- [ ] Duplicate deliveries do not silently create duplicate side effects.
- [ ] Delivery and execution states are distinct.

### Authorization

- [ ] No grant means no protected access.
- [ ] Grants are scoped to the relevant resources and actions.
- [ ] Expired and revoked grants are rejected.
- [ ] Approval is bound to the exact requested action.
- [ ] Delegation cannot increase authority.
- [ ] Policy enforcement is performed outside untrusted agent reasoning.

### Connectivity

- [ ] Credentials are isolated from agents that do not need them.
- [ ] Each tool call is checked against the applicable permissions.
- [ ] Connector errors and unknown execution outcomes are represented accurately.
- [ ] Tool outputs are treated as untrusted data.
- [ ] Cross-tenant access tests pass.

### Receipts and audit

- [ ] Every protected execution links to its authorization decision.
- [ ] Approval evidence is retained where required.
- [ ] The record distinguishes success, failure, rejection, cancellation, and unknown outcomes.
- [ ] Sensitive credentials are absent from logs and receipts.
- [ ] Authorized users can reconstruct the sequence of events.

### Developer experience

- [ ] A documented quickstart runs successfully.
- [ ] A successful request can be reproduced.
- [ ] A denied request can be reproduced.
- [ ] API errors are documented and actionable.
- [ ] The system can be tested without granting unrestricted production access.

---

## 24. Risks and Open Questions

### Protocol complexity

A universal identity and signaling protocol can become too broad before it solves a concrete problem.

**Mitigation:** Keep the first protocol version small, explicitly define its boundaries, and defer optional capabilities.

### Competition with existing standards

Identity, authorization, event delivery, and tool connectivity already have established standards.

**Mitigation:** Reuse mature standards wherever possible and document the specific agent-oriented gaps ACPP fills.

### Centralization risk

A centralized gateway may become a single point of failure or a highly privileged control plane.

**Mitigation:** Use least-privilege execution, isolation, reliable revocation, auditable policy decisions, and a portable protocol.

### False trust

A valid identity may belong to a malicious or compromised agent.

**Mitigation:** Never infer authorization or safety solely from identity verification or reputation.

### Credential concentration

Centralizing integrations creates an attractive target for attackers.

**Mitigation:** Use managed secrets infrastructure, strict isolation, scoped credentials, audit controls, and a carefully designed execution boundary.

### Network effects

An identity protocol has limited value until multiple independent systems support it.

**Mitigation:** Start with a developer problem that delivers standalone value, such as centralized governed connectivity with verifiable agent identity, then expand interoperability.

### Product positioning

The product could be confused with a messaging app, identity provider, MCP gateway, or agent framework.

**Mitigation:** Keep the public message consistent: identity, permissions, and accountable communication for agents.

### Key strategic question

The product must eventually decide how much of the identity and signal network can operate independently of ACPP's hosted service.

This should be resolved through explicit protocol design, customer requirements, and threat analysis rather than assuming either full centralization or full decentralization is inherently better.

---

## 25. Final Product Definition

ACPP is an identity and authorization infrastructure for AI agents, people, and services.

It provides stable agent identities, controlled discovery, structured signal exchange, explicit delegation, policy-enforced access, and verifiable records of consequential interactions.

It integrates with existing tools and protocols—including MCP—so developers can reuse their current systems without building bespoke identity and permission mechanisms for every application.

The hosted platform makes this infrastructure practical through a developer API, connection management, policy controls, approval workflows, and an audit interface.

The protocol remains modular and interoperable, while the hosted product delivers the convenience, governance, and operational experience needed for adoption.

### The product in one sentence

**ACPP gives AI agents a verifiable identity, a controlled way to communicate, and a governed way to act across systems.**

### The product promise

An agent should not need a separate, opaque identity and unrestricted credentials in every application it touches.

Its identity should be verifiable. Its authority should be explicit. Its communications should be attributable. Its actions should be authorized. Its outcomes should be traceable.

### Guiding principle

**Identity establishes who. Authorization establishes what is allowed. Signals establish what is requested. Receipts establish what happened.**

That is the foundation ACPP should build.
