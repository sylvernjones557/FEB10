from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.modules.ai_gateway import process_frame

router = APIRouter()


@router.websocket("/ws/attendance/{session_id}")
async def attendance_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()

    try:
        while True:
            frame: bytes = await websocket.receive_bytes()

            # Phase 3.1 guard
            if not frame:
                continue

            detected_count = process_frame(
                session_id=session_id,
                frame=frame
            )

            await websocket.send_json({
                "session_id": session_id,
                "detected_count": detected_count
            })

    except WebSocketDisconnect:
        print(f"[WS] Attendance session disconnected: {session_id}")

