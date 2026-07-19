namespace TeamOutingApi.Models;

public class Member
{
    public int Id { get; set; }
    public string PhoneNumber { get; set; } = "";   // unique login identifier
    public string? Name { get; set; }                // set on first successful registration
    public string Avatar { get; set; } = "?";         // initials, computed from Name
    public string Role { get; set; } = "Member";      // "Admin" | "Member"
    public string? Email { get; set; }
}
