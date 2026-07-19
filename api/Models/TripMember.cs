namespace TeamOutingApi.Models;

public class TripMember
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public Trip? Trip { get; set; }
    public int MemberId { get; set; }
    public Member? Member { get; set; }
}
