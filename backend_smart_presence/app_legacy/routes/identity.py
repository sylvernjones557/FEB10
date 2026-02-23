from fastapi import APIRouter, HTTPException
from app.modules.identity_registration.live_registration import LiveFaceRegistrar

router = APIRouter(
    prefix="/identity",
    tags=["Identity"]
)


@router.post("/register_face")
def register_face(
    person_id: str,
    video_source: str = "http://192.168.1.4:8080/video"
):
    """
    Live camera face registration (backend only)

    person_id     : student/staff unique ID
    video_source  : IP camera stream (phone)
    """

    try:
        registrar = LiveFaceRegistrar(
            video_source=video_source
        )
        result = registrar.register(person_id)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
