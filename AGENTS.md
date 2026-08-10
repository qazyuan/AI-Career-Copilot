# AI Career Copilot Development Guide

## Project Overview

AI Career Copilot is a Chrome Extension AI assistant.

The goal:

Help users analyze job opportunities,
match jobs with personal experience,
optimize resumes,
and prepare interviews.

This project is:

- Personal productivity tool
- AI Agent portfolio project
- Open source friendly

---

# Architecture

This is a client-side AI application.

Users provide their own AI API Keys.

The extension directly communicates with AI providers.

No backend is required in MVP.

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS

## Browser

- Chrome Extension Manifest V3

## Storage

- Chrome Storage API
- IndexedDB

## AI Providers

Support:

- OpenAI
- DeepSeek
- Qwen

---

# Coding Rules

## Before coding

Always:

1. Understand requirement

2. Explain architecture

3. Explain files to modify

4. Then implement

Do not generate large amounts of unrelated code.

---

# AI Architecture Rules

Never directly call a specific AI vendor.

Use abstraction:

AIProvider

- chat()
- embedding()

Example:

DeepSeekProvider

OpenAIProvider

QwenProvider

Business logic should not depend on a specific model.

---

# Agent Design

Each Agent should:

- Have clear responsibility
- Have independent prompt
- Have structured output

Agents:

Resume Agent

Job Analyzer Agent

Matching Agent

Interview Agent

---

# Security Rules

Never:

- hardcode API keys
- upload user data without permission

API keys should be stored locally.

---

# Development Workflow

Feature development:

Requirement

↓

Design

↓

Implementation

↓

Testing

↓

Documentation update

---

# Current Goal

Phase 0:

Initialize React Chrome Extension.

Phase 1:

Implement AI Provider configuration.
