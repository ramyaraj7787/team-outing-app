namespace TeamOutingApi.Dtos;

public record CreateTripRequest(string Name, string Date, string Location);
public record AddParticipantRequest(int MemberId);
public record AddParticipantByPhoneRequest(string PhoneNumber, string? Name);
public record UpdateItineraryItemRequest(string Time, string Title, string Detail, string Tag);
public record CreateAnnouncementRequest(string Text);
public record CreatePhotoRequest(string Caption, string Url);
public record CreateGameRequest(string Name, List<TeamSeed> Teams);
public record TeamSeed(string Name, string Color, List<int> MemberIds);
public record AddScoreRequest(int TeamId, int Points, string? Note);
public record ShuffleTeamsRequest(List<int> MemberIds);
public record UpdateMemberRoleRequest(string Role); // "Admin" | "Member"

public record RequestOtpRequest(string PhoneNumber);
public record VerifyOtpRequest(string PhoneNumber, string Code, string? Name);
