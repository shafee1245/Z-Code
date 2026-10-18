from io import BytesIO

import qrcode
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from qrcode.constants import ERROR_CORRECT_M
from qrcode.image.pil import PilImage

from src.modules.qrcodes.schemas import QRCodeRequest

router = APIRouter(prefix="/qrcodes", tags=["qrcodes"])


@router.post("/png", response_class=StreamingResponse, summary="Generate a QR code PNG")
def generate_png(payload: QRCodeRequest) -> StreamingResponse:
    code = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=max(1, payload.size // 33),
        border=4,
    )
    code.add_data(payload.content)
    code.make(fit=True)
    image: PilImage = code.make_image(fill_color=payload.foreground, back_color=payload.background)
    image = image.get_image().resize((payload.size, payload.size))
    output = BytesIO()
    image.save(output, format="PNG")
    output.seek(0)
    return StreamingResponse(output, media_type="image/png", headers={"Content-Disposition": "attachment; filename=qr-code.png"})
