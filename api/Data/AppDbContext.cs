using Microsoft.EntityFrameworkCore;
using TeamOutingApi.Models;

namespace TeamOutingApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Member> Members => Set<Member>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<ItineraryItem> ItineraryItems => Set<ItineraryItem>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<Game> Games => Set<Game>();
    public DbSet<GameTeam> GameTeams => Set<GameTeam>();
    public DbSet<GameTeamMember> GameTeamMembers => Set<GameTeamMember>();
    public DbSet<ScoreUpdate> ScoreUpdates => Set<ScoreUpdate>();
    public DbSet<TripMember> TripMembers => Set<TripMember>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<Session> Sessions => Set<Session>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Member>()
            .HasIndex(m => m.PhoneNumber)
            .IsUnique();

        b.Entity<Session>()
            .HasKey(s => s.Token);

        b.Entity<Trip>()
            .HasMany(t => t.Itinerary)
            .WithOne(i => i.Trip!)
            .HasForeignKey(i => i.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Trip>()
            .HasMany(t => t.Announcements)
            .WithOne(a => a.Trip!)
            .HasForeignKey(a => a.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Trip>()
            .HasMany(t => t.Photos)
            .WithOne(p => p.Trip!)
            .HasForeignKey(p => p.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Trip>()
            .HasMany(t => t.Games)
            .WithOne(g => g.Trip!)
            .HasForeignKey(g => g.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Game>()
            .HasMany(g => g.Teams)
            .WithOne(t => t.Game!)
            .HasForeignKey(t => t.GameId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Game>()
            .HasMany(g => g.Updates)
            .WithOne(u => u.Game!)
            .HasForeignKey(u => u.GameId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<GameTeam>()
            .HasMany(t => t.Members)
            .WithOne(m => m.GameTeam!)
            .HasForeignKey(m => m.GameTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Trip>()
            .HasMany(t => t.Participants)
            .WithOne(p => p.Trip!)
            .HasForeignKey(p => p.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<TripMember>()
            .HasOne(p => p.Member)
            .WithMany()
            .HasForeignKey(p => p.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Entity<TripMember>()
            .HasIndex(p => new { p.TripId, p.MemberId })
            .IsUnique();

        b.Entity<Announcement>()
            .HasOne(a => a.Author)
            .WithMany()
            .HasForeignKey(a => a.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Entity<Photo>()
            .HasOne(p => p.Uploader)
            .WithMany()
            .HasForeignKey(p => p.UploaderId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Entity<GameTeamMember>()
            .HasOne(m => m.Member)
            .WithMany()
            .HasForeignKey(m => m.MemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
