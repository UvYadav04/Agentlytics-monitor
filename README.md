# DataAnalyzer Monitoring UI Service

Standalone Next.js 14 observability dashboard for **DataAnalyzer**. Delivers visual waterfall traces, real-time RAG chunk inspection, token consumption metrics, and component latency breakdowns.

---

## Features

- **Investigation Waterfall**: Hierarchical timeline view of agent execution, RAG retriever/reranker operations, LLM completions, and sandboxed code execution.
- **Component Latency Analytics**: Instant P50/P95, min/max, and average latency grouped across all components (`rag.retriever`, `rag.reranker`, `llm`, `sandbox`, `agent`).
- **Span Inspector Drawer**: In-depth inspection of prompts, queries, retrieved chunks with scores, reranked ranks, code stdout/stderr, and Python error tracebacks.
- **Performance Bottlenecks**: Live ranking of the slowest operations across all investigations.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (defaults to port 3001)
npm run dev

# 3. Open in browser
http://localhost:3001/monitoring
```

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Backend API URL (where `/monitoring/*` endpoints live) |
| `NEXT_PUBLIC_BASE_PATH` | `/monitoring` | Base path for Next.js routing (prevents collision with main client) |
| `PORT` | `3001` | Service port |

---

## Production Deployment

This service is deployed via Docker and GitHub Actions:

- **Image**: `itzdineshyadav/data-analyzer:monitoring`
- **Workflow**: `.github/workflows/deploy.yml`
- **Port**: `3001`
- **Nginx Reverse Proxy**: Routed under `/monitoring` alongside the primary client at `/`.

