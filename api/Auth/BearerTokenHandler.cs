using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TeamOutingApi.Data;

namespace TeamOutingApi.Auth;

// A deliberately simple session-token scheme (not full JWT) — the token is an
// opaque random string looked up against the Sessions table on every request.
// Good enough for a small-team prototype; swap for real JWT/OAuth before wider rollout.
public class BearerTokenHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AppDbContext _db;

    public BearerTokenHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AppDbContext db) : base(options, logger, encoder)
    {
        _db = db;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return AuthenticateResult.NoResult();

        var value = authHeader.ToString();
        if (!value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();

        var token = value["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(token))
            return AuthenticateResult.NoResult();

        var session = await _db.Sessions.Include(s => s.Member).FirstOrDefaultAsync(s => s.Token == token);
        if (session is null || session.ExpiresAt < DateTime.UtcNow || session.Member is null)
            return AuthenticateResult.Fail("Invalid or expired session");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, session.MemberId.ToString()),
            new(ClaimTypes.Role, session.Member.Role),
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return AuthenticateResult.Success(ticket);
    }
}

public static class ClaimsPrincipalExtensions
{
    public static int GetMemberId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
