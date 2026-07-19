using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamOutingApi.Data;
using TeamOutingApi.Dtos;
using TeamOutingApi.Models;

namespace TeamOutingApi.Controllers;

[ApiController]
[Route("api/trips/{tripId}/[controller]")]
[Authorize(Roles = "Admin")]
public class GamesController : ControllerBase
{
    private readonly AppDbContext _db;
    public GamesController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<ActionResult<Game>> Create(int tripId, CreateGameRequest req)
    {
        if (!await _db.Trips.AnyAsync(t => t.Id == tripId)) return NotFound("Trip not found");

        var game = new Game { TripId = tripId, Name = req.Name, Status = "upcoming" };
        foreach (var team in req.Teams)
        {
            var gameTeam = new GameTeam { Name = team.Name, Color = team.Color };
            foreach (var memberId in team.MemberIds)
                gameTeam.Members.Add(new GameTeamMember { MemberId = memberId });
            game.Teams.Add(gameTeam);
        }
        _db.Games.Add(game);
        await _db.SaveChangesAsync();
        return Ok(game);
    }

    [HttpPut("{gameId}/status")]
    public async Task<IActionResult> UpdateStatus(int tripId, int gameId, [FromBody] string status)
    {
        var game = await _db.Games.FirstOrDefaultAsync(g => g.Id == gameId && g.TripId == tripId);
        if (game is null) return NotFound();
        game.Status = status;
        await _db.SaveChangesAsync();
        return Ok(game);
    }

    // Admin adds points to a team; also logs a scoreboard update entry
    [HttpPost("{gameId}/score")]
    public async Task<ActionResult<GameTeam>> AddScore(int tripId, int gameId, AddScoreRequest req)
    {
        var game = await _db.Games
            .Include(g => g.Teams)
            .FirstOrDefaultAsync(g => g.Id == gameId && g.TripId == tripId);
        if (game is null) return NotFound("Game not found");

        var team = game.Teams.FirstOrDefault(t => t.Id == req.TeamId);
        if (team is null) return NotFound("Team not found");

        team.Score += req.Points;
        _db.ScoreUpdates.Add(new ScoreUpdate
        {
            GameId = gameId,
            GameTeamId = team.Id,
            Text = req.Note ?? $"{team.Name} scores +{req.Points}",
        });
        await _db.SaveChangesAsync();
        return Ok(team);
    }

    // Admin reshuffles all members across the game's existing teams
    [HttpPost("{gameId}/shuffle")]
    public async Task<ActionResult<Game>> Shuffle(int tripId, int gameId, ShuffleTeamsRequest req)
    {
        var game = await _db.Games
            .Include(g => g.Teams).ThenInclude(t => t.Members)
            .FirstOrDefaultAsync(g => g.Id == gameId && g.TripId == tripId);
        if (game is null) return NotFound("Game not found");
        if (game.Teams.Count == 0) return BadRequest("Game has no teams to shuffle into");

        // clear existing assignments
        foreach (var team in game.Teams)
            _db.GameTeamMembers.RemoveRange(team.Members);
        await _db.SaveChangesAsync();

        var shuffled = req.MemberIds.OrderBy(_ => Guid.NewGuid()).ToList();
        for (int i = 0; i < shuffled.Count; i++)
        {
            var team = game.Teams[i % game.Teams.Count];
            _db.GameTeamMembers.Add(new GameTeamMember { GameTeamId = team.Id, MemberId = shuffled[i] });
        }
        await _db.SaveChangesAsync();

        var refreshed = await _db.Games
            .Include(g => g.Teams).ThenInclude(t => t.Members).ThenInclude(m => m.Member)
            .FirstAsync(g => g.Id == gameId);
        return Ok(refreshed);
    }
}
