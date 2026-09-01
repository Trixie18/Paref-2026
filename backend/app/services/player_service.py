from datetime import datetime, timezone

from app.core.errors import ForbiddenError, NotFoundError
from app.models import Player, User
from app.repositories import Repository
from app.schemas.player import PlayerCreateRequest, PlayerUpdateRequest


def list_players(repo: Repository, user: User) -> list[Player]:
    return repo.get_players(user_id=user.user_id)


def get_own_player(repo: Repository, user: User, player_id: str) -> Player:
    player = repo.get_player(player_id)
    if player is None:
        raise NotFoundError(f"Player {player_id} not found")
    if player.user_id != user.user_id:
        raise ForbiddenError("You can only access your own players")
    return player


def create_player(repo: Repository, user: User, req: PlayerCreateRequest) -> Player:
    return repo.create_player(
        Player(
            player_id="",
            user_id=user.user_id,
            parent_name=user.name,
            player_name=req.player_name,
            team=req.team,
            age_group=req.age_group,
            jersey_number=req.jersey_number,
            created_at=datetime.now(timezone.utc),
        )
    )


def update_player(repo: Repository, user: User, player_id: str, req: PlayerUpdateRequest) -> Player:
    get_own_player(repo, user, player_id)  # ownership check
    fields = {k: v for k, v in req.model_dump(exclude_unset=True).items() if v is not None}
    if not fields:
        return repo.get_player(player_id)
    return repo.update_player(player_id, **fields)
