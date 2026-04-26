# Voice Channel Rules

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Customer Phone                    │
├─────────────────────────────────────────────────┤
│           Twilio / WebRTC Gateway               │
├─────────────────────────────────────────────────┤
│              Voice Service                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │  STT    │  │   AI    │  │   TTS   │         │
│  │(OpenAI) │─▶│ Agent   │─▶│(OpenAI) │         │
│  └─────────┘  └─────────┘  └─────────┘         │
├─────────────────────────────────────────────────┤
│         Recording & Transcription Storage        │
└─────────────────────────────────────────────────┘
```

## OpenAI Voice Integration

### Speech-to-Text

```python
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def transcribe_audio(audio_file: bytes) -> str:
    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text"
    )
    return transcript
```

### Text-to-Speech

```python
async def synthesize_speech(text: str) -> bytes:
    response = await client.audio.speech.create(
        model="tts-1",
        voice="nova",  # Options: alloy, echo, fable, onyx, nova, shimmer
        input=text
    )
    return response.content
```

## Rules ⭐

### Critical Voice Processing Rule

**CRITICAL:** Do not stream raw audio to AI prompts

- ✅ **Always**: Audio → STT → Text → RAG/Agent → TTS → Audio
- ❌ **Never**: Send raw audio bytes directly to LLM APIs
- **Why**: LLMs process text, not audio. Use STT (Whisper) first, then text-based processing
- **Exception**: Audio-specific models designed for audio input (Whisper for transcription)

**Correct Pipeline:**
```python
# ✅ CORRECT - STT first, then text processing
audio = await capture_audio(call_id)
text = await stt(audio)  # Convert to text FIRST
response = await agent.respond(text)  # Process text
speech = await tts(response)  # Convert response to audio

# ❌ WRONG - Raw audio to LLM
audio = await capture_audio(call_id)
response = await llm.process(audio)  # DON'T DO THIS
```

### General Rules

1. **Real-time processing** — STT/TTS latency must be <500ms
2. **Graceful degradation** — if AI fails, route to human agent
3. **Recording consent** — announce recording at call start
4. **Tenant isolation** — recordings stored per org, access controlled
5. **Transcription storage** — store transcripts for compliance and training

## Call Flow

```python
async def handle_voice_call(call_id: str, org_id: UUID):
    # Create call session
    session = await create_call_session(org_id, call_id, type="voice")

    # Play greeting
    greeting = await tts("Thank you for calling. How can I help you?")
    await stream_audio(call_id, greeting)

    # Conversation loop
    while not session.ended:
        # Capture customer speech
        audio = await capture_audio(call_id, silence_timeout=2.0)

        # Transcribe
        text = await stt(audio)
        await save_message(session.id, role="customer", content=text)

        # Generate AI response
        response = await agent.respond(session.conversation_id, text)
        await save_message(session.id, role="agent", content=response)

        # Speak response
        audio_response = await tts(response)
        await stream_audio(call_id, audio_response)
```

## Call Session Schema

```sql
CREATE TABLE call_sessions (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    conversation_id UUID REFERENCES conversations(id),
    type VARCHAR(20) NOT NULL,  -- 'voice' or 'video'
    status VARCHAR(20) NOT NULL,  -- 'ringing', 'active', 'ended'
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    recording_url TEXT,
    transcript_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Voice Quality

- Sample rate: 16kHz minimum
- Format: PCM/WAV for STT, MP3/Opus for streaming
- Buffer size: 20ms chunks for real-time
- Echo cancellation required for bidirectional
