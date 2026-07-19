using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamOutingApi.Auth;
using TeamOutingApi.Data;
using TeamOutingApi.Dtos;
using TeamOutingApi.Models;
using TeamOutingApi.Sms;

namespace TeamOutingApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISmsSender _sms;
    private static readonly Random _rng = new();

    public AuthController(AppDbContext db, ISmsSender sms) { _db = db; _sms = sms; }

    private static string NormalizePhone(string phone) =>
        new string(phone.Where(c => char.IsDigit(c) || c == '+').ToArray());

    // Step 1: request a one-time code for a phone number.
    // If a real provider (ISmsSender.IsConfigured) is wired up, this actually texts
    // the code and the response omits it. Otherwise it falls back to dev mode:
    // the code is returned directly in the response, clearly marked.
    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp(RequestOtpRequest req)
    {
        var phone = NormalizePhone(req.PhoneNumber);
        if (phone.Length < 7) return BadRequest("Enter a valid mobile number.");

        var stale = await _db.OtpCodes.Where(o => o.PhoneNumber == phone && !o.Consumed).ToListAsync();
        foreach (var s in stale) s.Consumed = true;

        var code = _rng.Next(100000, 999999).ToString();
        _db.OtpCodes.Add(new OtpCode { PhoneNumber = phone, Code = code, ExpiresAt = DateTime.UtcNow.AddMinutes(5) });
        await _db.SaveChangesAsync();

        var sent = await _sms.SendAsync(phone, $"Your Team Outings verification code is {code}. It expires in 5 minutes.");

        if (_sms.IsConfigured)
        {
            if (!sent) return StatusCode(502, new { message = "Couldn't send the SMS. Check the server logs and provider credentials." });
            return Ok(new { message = "OTP sent." });
        }

        // dev fallback — no real provider configured
        return Ok(new { message = "OTP generated.", devOtp = code, devNote = "No SMS provider connected yet — this code is shown here instead of texted." });
    }

    // Step 2: verify the code. If this phone has never registered before,
    // `name` is required and this call also creates the account.
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpRequest req)
    {
        var phone = NormalizePhone(req.PhoneNumber);
        var otp = await _db.OtpCodes
            .Where(o => o.PhoneNumber == phone && o.Code == req.Code && !o.Consumed && o.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp is null) return BadRequest(new { message = "That code is invalid or has expired." });
        otp.Consumed = true;

        var member = await _db.Members.FirstOrDefaultAsync(m => m.PhoneNumber == phone);
        var isNew = member is null;

        if (member is null)
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return BadRequest(new { message = "First time here — your name is required.", needsName = true });

            var isFirstEver = !await _db.Members.AnyAsync();
            member = new Member
            {
                PhoneNumber = phone,
                Name = req.Name.Trim(),
                Avatar = Initials(req.Name),
                Role = isFirstEver ? "Admin" : "Member",
            };
            _db.Members.Add(member);
        }
        else if (string.IsNullOrWhiteSpace(member.Name) && !string.IsNullOrWhiteSpace(req.Name))
        {
            // completes a profile that an admin pre-added by phone number only
            member.Name = req.Name.Trim();
            member.Avatar = Initials(req.Name);
        }

        await _db.SaveChangesAsync();

        var session = new Session
        {
            Token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
            MemberId = member.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();

        return Ok(new { token = session.Token, member, isNewAccount = isNew });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<Member>> Me()
    {
        var member = await _db.Members.FindAsync(User.GetMemberId());
        return member is null ? NotFound() : Ok(member);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var authHeader = Request.Headers["Authorization"].ToString();
        var token = authHeader.StartsWith("Bearer ") ? authHeader["Bearer ".Length..].Trim() : null;
        if (token is not null)
        {
            var session = await _db.Sessions.FindAsync(token);
            if (session is not null) { _db.Sessions.Remove(session); await _db.SaveChangesAsync(); }
        }
        return NoContent();
    }

    private static string Initials(string name) =>
        string.Concat(name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(p => p[0])).ToUpper();
}
