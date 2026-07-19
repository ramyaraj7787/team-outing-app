using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamOutingApi.Auth;
using TeamOutingApi.Data;
using TeamOutingApi.Dtos;
using TeamOutingApi.Models;

namespace TeamOutingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly AppDbContext _db;
    public TripsController(AppDbContext db) => _db = db;

    private Task<bool> IsParticipantAsync(int tripId, int memberId) =>
        _db.TripMembers.AnyAsync(p => p.TripId == tripId && p.MemberId == memberId);

    // Only trips the caller actually participates in.
    [HttpGet]
    public async Task<ActionResult<object>> GetAll()
    {
        var uid = User.GetMemberId();
        return await _db.Trips
            .Where(t => t.Participants.Any(p => p.MemberId == uid))
            .Select(t => new { t.Id, t.Name, t.Date, t.Location, t.Status })
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Trip>> GetOne(int id)
    {
        var uid = User.GetMemberId();
        var trip = await _db.Trips
            .Include(t => t.Itinerary)
            .Include(t => t.Announcements).ThenInclude(a => a.Author)
            .Include(t => t.Photos).ThenInclude(p => p.Uploader)
            .Include(t => t.Games).ThenInclude(g => g.Teams).ThenInclude(tm => tm.Members).ThenInclude(m => m.Member)
            .Include(t => t.Games).ThenInclude(g => g.Updates)
            .Include(t => t.Participants).ThenInclude(p => p.Member)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip is null) return NotFound();
        if (!trip.Participants.Any(p => p.MemberId == uid)) return Forbid();

        return Ok(trip);
    }

    // Creating a trip auto-adds the creator as its first participant. Admin only.
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<Trip>> Create(CreateTripRequest req)
    {
        var uid = User.GetMemberId();
        var trip = new Trip { Name = req.Name, Date = req.Date, Location = req.Location, Status = "upcoming" };
        _db.Trips.Add(trip);
        await _db.SaveChangesAsync();

        _db.TripMembers.Add(new TripMember { TripId = trip.Id, MemberId = uid });
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOne), new { id = trip.Id }, trip);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
    {
        var trip = await _db.Trips.FindAsync(id);
        if (trip is null) return NotFound();
        trip.Status = status;
        await _db.SaveChangesAsync();
        return Ok(trip);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var trip = await _db.Trips.FindAsync(id);
        if (trip is null) return NotFound();
        _db.Trips.Remove(trip);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Participants ----
    [Authorize(Roles = "Admin")]
    [HttpPost("{tripId}/participants")]
    public async Task<IActionResult> AddParticipant(int tripId, AddParticipantRequest req)
    {
        if (!await _db.Trips.AnyAsync(t => t.Id == tripId)) return NotFound("Trip not found");
        if (!await _db.Members.AnyAsync(m => m.Id == req.MemberId)) return NotFound("Member not found");
        if (!await _db.TripMembers.AnyAsync(p => p.TripId == tripId && p.MemberId == req.MemberId))
        {
            _db.TripMembers.Add(new TripMember { TripId = tripId, MemberId = req.MemberId });
            await _db.SaveChangesAsync();
        }
        var participant = await _db.TripMembers.Include(p => p.Member).FirstAsync(p => p.TripId == tripId && p.MemberId == req.MemberId);
        return Ok(participant);
    }

    // Admin adds someone to a trip by phone number even if they haven't registered yet.
    [Authorize(Roles = "Admin")]
    [HttpPost("{tripId}/participants/by-phone")]
    public async Task<IActionResult> AddParticipantByPhone(int tripId, AddParticipantByPhoneRequest req)
    {
        if (!await _db.Trips.AnyAsync(t => t.Id == tripId)) return NotFound("Trip not found");
        var phone = new string(req.PhoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());
        if (phone.Length < 7) return BadRequest("Enter a valid mobile number.");

        var member = await _db.Members.FirstOrDefaultAsync(m => m.PhoneNumber == phone);
        if (member is null)
        {
            member = new Member
            {
                PhoneNumber = phone,
                Name = string.IsNullOrWhiteSpace(req.Name) ? null : req.Name.Trim(),
                Avatar = string.IsNullOrWhiteSpace(req.Name) ? "?" : string.Concat(req.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(p => p[0])).ToUpper(),
                Role = "Member",
            };
            _db.Members.Add(member);
            await _db.SaveChangesAsync();
        }

        if (!await _db.TripMembers.AnyAsync(p => p.TripId == tripId && p.MemberId == member.Id))
        {
            _db.TripMembers.Add(new TripMember { TripId = tripId, MemberId = member.Id });
            await _db.SaveChangesAsync();
        }

        var participant = await _db.TripMembers.Include(p => p.Member).FirstAsync(p => p.TripId == tripId && p.MemberId == member.Id);
        return Ok(participant);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{tripId}/participants/{memberId}")]
    public async Task<IActionResult> RemoveParticipant(int tripId, int memberId)
    {
        var participant = await _db.TripMembers.FirstOrDefaultAsync(p => p.TripId == tripId && p.MemberId == memberId);
        if (participant is null) return NotFound();
        _db.TripMembers.Remove(participant);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Itinerary (schedule) — admin only ----
    [Authorize(Roles = "Admin")]
    [HttpPost("{tripId}/itinerary")]
    public async Task<ActionResult<ItineraryItem>> AddItineraryItem(int tripId, UpdateItineraryItemRequest req)
    {
        if (!await _db.Trips.AnyAsync(t => t.Id == tripId)) return NotFound("Trip not found");
        var item = new ItineraryItem { TripId = tripId, Time = req.Time, Title = req.Title, Detail = req.Detail, Tag = req.Tag };
        _db.ItineraryItems.Add(item);
        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{tripId}/itinerary/{itemId}")]
    public async Task<ActionResult<ItineraryItem>> UpdateItineraryItem(int tripId, int itemId, UpdateItineraryItemRequest req)
    {
        var item = await _db.ItineraryItems.FirstOrDefaultAsync(i => i.Id == itemId && i.TripId == tripId);
        if (item is null) return NotFound();
        item.Time = req.Time; item.Title = req.Title; item.Detail = req.Detail; item.Tag = req.Tag;
        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{tripId}/itinerary/{itemId}")]
    public async Task<IActionResult> DeleteItineraryItem(int tripId, int itemId)
    {
        var item = await _db.ItineraryItems.FirstOrDefaultAsync(i => i.Id == itemId && i.TripId == tripId);
        if (item is null) return NotFound();
        _db.ItineraryItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Announcements — admin only, matching "admin posts updates" ----
    [Authorize(Roles = "Admin")]
    [HttpPost("{tripId}/announcements")]
    public async Task<ActionResult<Announcement>> AddAnnouncement(int tripId, CreateAnnouncementRequest req)
    {
        var uid = User.GetMemberId();
        if (!await IsParticipantAsync(tripId, uid)) return Forbid();
        var announcement = new Announcement { TripId = tripId, AuthorId = uid, Text = req.Text };
        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync();
        var withAuthor = await _db.Announcements.Include(a => a.Author).FirstAsync(a => a.Id == announcement.Id);
        return Ok(withAuthor);
    }

    // ---- Photos — any participant can share ----
    [HttpPost("{tripId}/photos")]
    public async Task<ActionResult<Photo>> AddPhoto(int tripId, CreatePhotoRequest req)
    {
        var uid = User.GetMemberId();
        if (!await IsParticipantAsync(tripId, uid)) return Forbid();
        var photo = new Photo { TripId = tripId, UploaderId = uid, Caption = req.Caption, Url = req.Url };
        _db.Photos.Add(photo);
        await _db.SaveChangesAsync();
        var withUploader = await _db.Photos.Include(p => p.Uploader).FirstAsync(p => p.Id == photo.Id);
        return Ok(withUploader);
    }
}
