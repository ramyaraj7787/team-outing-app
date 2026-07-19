namespace TeamOutingApi.Models;

public class Session
{
    public string Token { get; set; } = "";  // primary key, opaque random string
    public int MemberId { get; set; }
    public Member? Member { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
}
