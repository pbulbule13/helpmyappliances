# Video Channel Rules

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Customer Browser                    │
│         (WebRTC Media Streams)                   │
├─────────────────────────────────────────────────┤
│            Video Service (SFU)                   │
│    Daily.co / Twilio Video / LiveKit            │
├─────────────────────────────────────────────────┤
│              Support Dashboard                   │
│         (Agent joins video room)                 │
├─────────────────────────────────────────────────┤
│       Recording & Transcription Pipeline         │
└─────────────────────────────────────────────────┘
```

## WebRTC Integration

```typescript
// Frontend: Join video room
import Daily from '@daily-co/daily-js';

const callFrame = Daily.createFrame({
  showLeaveButton: true,
  iframeStyle: {
    width: '100%',
    height: '100%',
  },
});

await callFrame.join({
  url: roomUrl,
  token: participantToken
});

// Handle events
callFrame.on('participant-joined', (event) => {
  console.log('Participant joined:', event.participant);
});
```

## Backend Room Management

```python
# Create video room for conversation
async def create_video_room(org_id: UUID, conversation_id: UUID) -> VideoRoom:
    # Create room via provider API
    room = await video_provider.create_room(
        name=f"conv-{conversation_id}",
        properties={
            "max_participants": 2,
            "enable_recording": True,
            "enable_transcription": True,
        }
    )

    # Store session
    session = CallSession(
        organization_id=org_id,
        conversation_id=conversation_id,
        type="video",
        status="waiting",
        room_url=room.url
    )
    await repo.create(session)

    return room
```

## Rules

1. **Peer-to-peer when possible** — reduce server load for 1:1 calls
2. **SFU for group calls** — server-mediated for 3+ participants
3. **Recording consent** — explicit opt-in with visual indicator
4. **Bandwidth adaptation** — degrade video quality before dropping
5. **Fallback to voice** — if video fails, offer voice-only option
6. **Screen sharing** — support for troubleshooting scenarios

## AI Enhancement

```python
# Real-time transcription during video call
async def transcribe_video_stream(room_id: str):
    async for audio_chunk in get_audio_stream(room_id):
        transcript = await stt(audio_chunk)
        await broadcast_transcript(room_id, transcript)

        # AI suggestions for agent (internal only)
        if should_suggest(transcript):
            suggestion = await agent.get_suggestion(transcript)
            await send_to_agent_dashboard(room_id, suggestion)
```

## Video Session Schema

```sql
-- Extends call_sessions table
-- type = 'video'
-- Additional fields:
ALTER TABLE call_sessions ADD COLUMN room_url TEXT;
ALTER TABLE call_sessions ADD COLUMN screen_share_enabled BOOLEAN DEFAULT false;
```

## Frontend Components

```typescript
// components/video/VideoCall.tsx
interface VideoCallProps {
  roomUrl: string;
  token: string;
  onEnd: () => void;
}

export function VideoCall({ roomUrl, token, onEnd }: VideoCallProps) {
  const [callFrame, setCallFrame] = useState<DailyCall | null>(null);

  useEffect(() => {
    const frame = Daily.createFrame(containerRef.current!);
    frame.join({ url: roomUrl, token });
    setCallFrame(frame);

    return () => frame.destroy();
  }, [roomUrl, token]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <VideoControls
        onMute={() => callFrame?.setLocalAudio(false)}
        onHangup={() => { callFrame?.leave(); onEnd(); }}
      />
    </div>
  );
}
```

## Quality Settings

| Network | Video | Audio |
|---------|-------|-------|
| Excellent | 720p 30fps | 48kHz stereo |
| Good | 480p 24fps | 48kHz mono |
| Poor | 240p 15fps | 16kHz mono |
| Critical | Audio only | 16kHz mono |
