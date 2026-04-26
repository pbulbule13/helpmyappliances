# RAG Pipeline Rules

<!-- [CHANGE] Update AI provider (OpenAI, Anthropic, etc.) or remove if not using RAG -->

## Modular Architecture ⭐

**CRITICAL:** Separate RAG concerns into distinct, independent modules

### Pipeline Stages (Keep Separate)

```
INGESTION PIPELINE (Build-Time):
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Ingest    │───▶│   Parse     │───▶│   Chunk     │───▶│   Embed     │
│  Documents  │    │  Content    │    │  Text       │    │  (AI API)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                  │
                                                                  ▼
                                                          ┌─────────────┐
                                                          │   Index     │
                                                          │  (Vector)   │
                                                          └─────────────┘

RETRIEVAL PIPELINE (Query-Time):
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Query     │───▶│  Retrieve   │───▶│   Rerank    │───▶│  Assemble   │
│  Embed      │    │  Vectors    │    │  Results    │    │  Context    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                  │
                                                                  ▼
                                                          ┌─────────────┐
                                                          │  Generate   │
                                                          │  Answer     │
                                                          └─────────────┘
```

### Module Boundaries (Strictly Enforce)

**DO:**
- ✅ Separate ingestion logic from retrieval logic
- ✅ Keep parsing, chunking, embedding, indexing as independent steps
- ✅ Modularize retrieval, reranking, context assembly, generation
- ✅ Make each stage independently testable and swappable

**DON'T:**
- ❌ Mix ingestion and generation logic in same module
- ❌ Couple embedding generation with vector storage
- ❌ Embed retrieval logic inside generation functions
- ❌ Tightly couple to specific AI provider APIs

## OpenAI Integration

```python
from openai import AsyncOpenAI

client = AsyncOpenAI()

# Embeddings
async def embed_text(text: str) -> list[float]:
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

# Generation with context
async def generate_response(query: str, context: list[str]) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
        ]
    )
    return response.choices[0].message.content
```

## Chunking Strategy

### Deterministic Chunking ⭐

**CRITICAL:** Use deterministic chunking to prevent inconsistent fragmentation

**Rules:**
- Same document + same settings = same chunks (always)
- Chunk boundaries must be reproducible across re-indexing
- Use content-based hashing to detect chunk changes
- Version chunk strategy in metadata

**Why:** Prevents duplicate/inconsistent embeddings, enables incremental updates, supports A/B testing

### Chunk Configuration

```python
# Chunk settings (make configurable, not hardcoded)
CHUNK_SIZE = 512  # tokens (adjust based on model context window)
CHUNK_OVERLAP = 50  # tokens (prevent context loss at boundaries)
CHUNK_METHOD = "semantic"  # or "recursive" or "sentence"

# Deterministic chunking example
def chunk_document(document: Document, config: ChunkConfig) -> list[Chunk]:
    """
    Deterministically chunk document using consistent algorithm.

    IMPORTANT: Same input + same config must produce same chunks.
    """
    chunks = []

    # Use deterministic splitter (not random/AI-based)
    if config.method == "semantic":
        chunks = semantic_chunk(document.content, config)
    elif config.method == "sentence":
        chunks = sentence_chunk(document.content, config)
    else:
        chunks = recursive_chunk(document.content, config)

    # Add stable metadata
    for i, chunk in enumerate(chunks):
        chunk.metadata = {
            "source": document.id,
            "chunk_index": i,
            "chunk_method": config.method,
            "chunk_version": config.version,  # Track chunking algorithm version
        }

    return chunks
```

### Chunk Metadata (Preserve for Traceability)

**Required fields:**
- `source_document_id` - Original document reference
- `chunk_index` - Position in document (0-indexed)
- `chunk_hash` - Content hash for change detection
- `page_number` - Page reference (if applicable)
- `section` - Section/chapter reference (if applicable)
- `title` - Document title
- `organization_id` - Tenant scoping (multi-tenant only)
- `created_at` - Timestamp
- `chunk_version` - Algorithm version for migration

**Optional but recommended:**
- `language` - Document language
- `content_type` - PDF, markdown, HTML, etc.
- `author` - Document author
- `tags` - Classification tags

## Retrieval & Reranking

### Vector Search Parameters

**Configurable settings (don't hardcode):**
```python
class RetrievalConfig:
    top_k: int = 20  # Number of candidates to retrieve
    score_threshold: float = 0.7  # Minimum similarity score
    filters: dict = {}  # Metadata filters (tenant_id, tags, etc.)
    rerank: bool = True  # Enable reranking
    rerank_top_n: int = 5  # Final results after reranking
```

### Reranking for Relevance ⭐

**Why Rerank:** Initial vector search may miss nuanced relevance; reranking improves precision

**Reranking Strategies:**

1. **Cross-encoder reranking** (most accurate, slower)
   ```python
   # Use specialized reranking model
   from sentence_transformers import CrossEncoder
   reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-12-v2')

   scores = reranker.predict([(query, chunk.content) for chunk in candidates])
   reranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
   ```

2. **LLM-based reranking** (high quality, expensive)
   ```python
   # Ask LLM to score relevance
   prompt = f"Rate relevance of this passage to query '{query}': {passage}"
   score = await llm.score_relevance(prompt)
   ```

3. **Hybrid search** (vector + keyword)
   ```python
   # Combine vector similarity with BM25/keyword scores
   vector_results = vector_search(query_embedding, top_k=50)
   keyword_results = bm25_search(query, top_k=50)
   reranked = merge_and_rerank(vector_results, keyword_results)
   ```

**When to skip reranking:**
- Very few candidates (top_k < 10)
- Latency is critical (< 100ms response time)
- High confidence in vector search (score > 0.9)

---

## Rules

### 1. Tenant Isolation (CRITICAL) ⭐

**Never retrieve documents across organizations/tenants**
   ```python
   # Vector query MUST include org filter
   results = vector_store.query(
       embedding=query_embedding,
       filter={"organization_id": org_id},
       top_k=10
   )
   ```

### 2. Source Attribution (CRITICAL) ⭐

**Always cite sources** — include document references in responses
   ```python
   response = {
       "answer": "...",
       "sources": [
           {"document_id": "...", "chunk_id": "...", "snippet": "..."}
       ]
   }
   ```

### 3. Embedding State Tracking

**Track embedding state** — use `embeddings_metadata` to avoid unnecessary re-indexing
   ```python
   # Check if document needs re-embedding
   if doc.updated_at > embedding_meta.indexed_at:
       await reindex_document(doc)
   ```

### 4. Graceful Degradation

**Handle failures gracefully**
   - Queue failed embeddings for retry
   - Log failures to `usage_events`
   - Return partial results if some chunks fail

### 5. Grounded Responses Only ⭐

**No hallucination** — if context doesn't contain answer, explicitly say so

**Anti-Patterns:**
- ❌ Never dump raw full documents into prompts when chunking expected
- ❌ Don't mix ingestion/generation logic in shared modules
- ❌ Don't hide retrieval failures silently—make debugging transparent
- ❌ Don't return ungrounded answers without source citation
   ```python
   SYSTEM_PROMPT = """
   Answer based ONLY on the provided context.
   If the context doesn't contain the answer, say "I don't have information about that."
   Always cite which document(s) you used.
   """
   ```

### 6. Context Assembly Best Practices

**Handle follow-up questions:**
- Use conversation history for context
- Maintain session state for multi-turn conversations
- Re-retrieve if context window exceeded

**Handle low-confidence results:**
- Set minimum confidence thresholds
- Return "insufficient information" when below threshold
- Suggest alternative queries or escalate to human

**Optimize prompt assembly:**
- Order chunks by relevance score (highest first)
- Truncate gracefully if context window limit reached
- Include metadata (source, page) for user verification

---

## Vector Store

**Options:**
- **pgvector** - PostgreSQL extension (good for small-medium scale)
- **Pinecone** - Managed vector database (scales well)
- **Weaviate** - Open-source vector database
- **Qdrant** - High-performance vector search
- **Chroma** - Lightweight embedding database

**Best Practices:**
- Index on `organization_id` / `tenant_id` for filtered queries
- Store minimal metadata in vector store, full data in main database
- Use namespace/collection per tenant for complete isolation
- Monitor vector index size and query performance
- Implement backup/restore for vector indices

## Embeddings Metadata Table

Track sync state in `embeddings_metadata`:

```python
# Check if document needs re-embedding
async def needs_reindex(doc: Document) -> bool:
    meta = await repo.get_embedding_metadata(doc.id)
    if not meta:
        return True
    if meta.status != "indexed":
        return True
    if doc.updated_at > meta.indexed_at:
        return True
    return False

# Update after successful indexing
await repo.update_embedding_metadata(
    document_id=doc.id,
    organization_id=doc.organization_id,
    vector_store_id=vector_id,
    status="indexed",
    indexed_at=datetime.utcnow()
)
```
