from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models import User
from app.repositories import Repository, get_repository
from app.schemas.player import PlayerCreateRequest, PlayerResponse, PlayerUpdateRequest
from app.services import player_service

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("", response_model=list[PlayerResponse])
def list_players(user: Annotated[User, Depends(get_current_user)], repo: Annotated[Repository, Depends(get_repository)]):
    return player_service.list_players(repo, user)


@router.post("", response_model=PlayerResponse, status_code=201)
def create_player(
    req: PlayerCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return player_service.create_player(repo, user, req)


@router.get("/{player_id}", response_model=PlayerResponse)
def get_player(
    player_id: str,
    user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return player_service.get_own_player(repo, user, player_id)


@router.put("/{player_id}", response_model=PlayerResponse)
def update_player(
    player_id: str,
    req: PlayerUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    repo: Annotated[Repository, Depends(get_repository)],
):
    return player_service.update_player(repo, user, player_id, req)
