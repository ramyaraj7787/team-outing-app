namespace TeamOutingApi.Models;

public class OtpCode
{
    public int Id { get; set; }
    public string PhoneNumber { get; set; } = "";
    public string Code { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public bool Consumed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
