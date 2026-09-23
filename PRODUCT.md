# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Client**: Submits issues, tracks tickets, views pricing and project progress, closes resolved tickets with rating.
- **Developer / Agent**: Works the queue, filters, claims, resolves, tracks internal tasks.
- **Manager**: Sees queues, assigns work, configures escalation paths, manages roles.
- **Management / CEO / CTO**: Organization-wide visibility, security policy, service health, KPIs.
- **Marketing / Operations**: Scoped working access to their own projects.
- **Tester**: Submits issues against tested projects (read-only on claims).
- **Vendor**: Raises API-related tickets (read-only on details).

## Product Purpose
Claim Desk is a self-hosted customer support and organizational work management system for Remostarts. It provides a single system of record for client issues, internal project work, service health, and organization administration, replacing untracked communication channels.

## Positioning
A deliberately small and direct system where every screen is a working screen. A single place where clients enter through a portal, the team works in a console, and management has full visibility—without the bloat of a full ITSM suite or per-seat licensing.

## Operating Context
- Developers work out of a unified console to resolve client issues and a Kanban board for internal project tasks.
- Clients interact solely via a dedicated Client Portal.
- Managers and executives monitor unified dashboards for service health, escalations, and client satisfaction metrics.
- Self-hosted deployment, meaning data stays on the organization's own infrastructure.

## Capabilities and Constraints
- **Stack**: Next.js 14+ (App Router), React 18, Express.js (REST API + WebSockets), MongoDB.
- **Auth**: Google OAuth 2.0 or email/password.
- **Features**: Client Portal, Support Console, Kanban Project Work, Watchtower (Service Health), Unified Dashboard, Event Tracking, Documentation Hub, Administration/Governance, Feature Pricing display.
- **Constraints**: No AI auto-resolution, no payment/billing system (display only), no multi-tenant isolation beyond project level, no chat widget, no CMDB.
- **Scale**: Intended for small dev teams/client projects with ~50 active tickets.

## Brand Commitments
- Professional UI, professional English, no emoji.
- Clean, responsive design with clear status/priority indicators.

## Evidence on Hand
- Full PRD available outlining all features and constraints.
