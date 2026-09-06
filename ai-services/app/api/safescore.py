from fastapi import APIRouter

from app.models.batch_safescore import BatchSafeScoreRequest, BatchSafeScoreResponse
from app.models.safescore import SafeScoreRequest, SafeScoreResponse
from app.services.safescore_service import safescore_service

router = APIRouter(prefix="/internal/safescore", tags=["safescore"])


@router.post("", response_model=SafeScoreResponse)
async def compute_safescore(payload: SafeScoreRequest) -> SafeScoreResponse:
    return safescore_service.compute(payload)


@router.post("/batch", response_model=BatchSafeScoreResponse)
async def compute_safescore_batch(payload: BatchSafeScoreRequest) -> BatchSafeScoreResponse:
    """Used by the backend's RouteService and HeatmapService — see
    docs/architecture/API_DESIGN.md §17 for why this replaced the
    originally-separate /internal/saferoute and
    /internal/heatmap/recalculate endpoints: both are "score N points
    with the same formula," and a single batch endpoint avoids
    duplicating the scoring logic (and the HTTP round trips) between two
    nearly-identical ones."""
    results = safescore_service.compute_batch(payload.items)
    return BatchSafeScoreResponse(results=results)
