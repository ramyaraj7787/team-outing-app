namespace TeamOutingApi.Models;

public class Trip
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Date { get; set; } = "";         // display string, e.g. "Sat, 26 Sept"
    public string Location { get; set; } = "";
    public string Status { get; set; } = "upcoming"; // "upcoming" | "past"

    public List<ItineraryItem> Itinerary { get; set; } = new();
    public List<Announcement> Announcements { get; set; } = new();
    public List<Photo> Photos { get; set; } = new();
    public List<Game> Games { get; set; } = new();
    public List<TripMember> Participants { get; set; } = new();
}

public class ItineraryItem
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public Trip? Trip { get; set; }
    public string Time { get; set; } = "";
    public string Title { get; set; } = "";
    public string Detail { get; set; } = "";
    public string Tag { get; set; } = "logistics"; // travel | logistics | food | game | highlight
}

public class Announcement
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public Trip? Trip { get; set; }
    public int AuthorId { get; set; }
    public Member? Author { get; set; }
    public string Text { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Photo
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public Trip? Trip { get; set; }
    public int UploaderId { get; set; }
    public Member? Uploader { get; set; }
    public string Caption { get; set; } = "";
    public string Url { get; set; } = "";          // blob storage URL
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
