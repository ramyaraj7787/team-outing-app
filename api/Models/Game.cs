namespace TeamOutingApi.Models;

public class Game
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public Trip? Trip { get; set; }
    public string Name { get; set; } = "";
    public string Status { get; set; } = "upcoming"; // upcoming | live | completed

    public List<GameTeam> Teams { get; set; } = new();
    public List<ScoreUpdate> Updates { get; set; } = new();
}

public class GameTeam
{
    public int Id { get; set; }
    public int GameId { get; set; }
    public Game? Game { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#C97B3D";
    public int Score { get; set; } = 0;

    public List<GameTeamMember> Members { get; set; } = new();
}

public class GameTeamMember
{
    public int Id { get; set; }
    public int GameTeamId { get; set; }
    public GameTeam? GameTeam { get; set; }
    public int MemberId { get; set; }
    public Member? Member { get; set; }
}

public class ScoreUpdate
{
    public int Id { get; set; }
    public int GameId { get; set; }
    public Game? Game { get; set; }
    public int GameTeamId { get; set; }
    public string Text { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
