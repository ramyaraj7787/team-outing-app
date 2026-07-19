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
public class MembersController : ControllerBase
{
    private readonly AppDbContext _db;
    public MembersController(AppDbContext db) => _db = db;

    // Full company roster — any logged-in member can see names (used when an
    // admin picks someone existing to add to a trip).
    [HttpGet]
    public async Task<ActionResult<List<Member>>> GetAll() =>
        await _db.Members.OrderBy(m => m.Name).ToListAsync();

    // Admin "pre-adds" someone by phone number before they've registered —
    // creates a placeholder account that completes itself when that phone
    // number verifies its first OTP.
    [Authorize(Roles = "Admin")]
    [HttpPost("preadd")]
    public async Task<ActionResult<Member>> PreAdd(AddParticipantByPhoneRequest req)
    {
        var phone = new string(req.PhoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());
        if (phone.Length < 7) return BadRequest("Enter a valid mobile number.");

        var existing = await _db.Members.FirstOrDefaultAsync(m => m.PhoneNumber == phone);
        if (existing is not null) return Ok(existing);

        var member = new Member
        {
            PhoneNumber = phone,
            Name = string.IsNullOrWhiteSpace(req.Name) ? null : req.Name.Trim(),
            Avatar = string.IsNullOrWhiteSpace(req.Name) ? "?" : string.Concat(req.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(p => p[0])).ToUpper(),
            Role = "Member",
        };
        _db.Members.Add(member);
        await _db.SaveChangesAsync();
        return Ok(member);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateRole(int id, UpdateMemberRoleRequest req)
    {
        var member = await _db.Members.FindAsync(id);
        if (member is null) return NotFound();
        if (req.Role is not ("Admin" or "Member")) return BadRequest("Role must be Admin or Member");
        member.Role = req.Role;
        await _db.SaveChangesAsync();
        return Ok(member);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(int id)
    {
        var member = await _db.Members.FindAsync(id);
        if (member is null) return NotFound();
        _db.Members.Remove(member);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
