using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Npgsql;
using TeamOutingApi.Auth;
using TeamOutingApi.Data;

var builder = WebApplication.CreateBuilder(args);

// ---- Database ----
// Render (and Heroku-style hosts) inject a DATABASE_URL env var in the form
// postgres://user:pass@host:port/dbname — if present, use that (real persistence).
// Otherwise fall back to a local SQLite file for local dev.
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        options.UseNpgsql(ToNpgsqlConnectionString(databaseUrl));
    }
    else
    {
        options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=teamouting.db");
    }
});

static string ToNpgsqlConnectionString(string url)
{
    // Converts postgres://user:pass@host:port/db to Npgsql's Host=...;Username=...;... format
    var uri = new Uri(url);
    var userInfo = uri.UserInfo.Split(':', 2);
    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Username = userInfo[0],
        Password = userInfo.Length > 1 ? userInfo[1] : "",
        Database = uri.AbsolutePath.TrimStart('/'),
        SslMode = SslMode.Require,
        TrustServerCertificate = true,
    };
    return builder.ConnectionString;
}

// ---- Auth: simple opaque bearer-token sessions issued after OTP verification ----
builder.Services.AddAuthentication("Bearer")
    .AddScheme<AuthenticationSchemeOptions, BearerTokenHandler>("Bearer", null);
builder.Services.AddAuthorization();

// ---- CORS ----
// Reads allowed origins from the ALLOWED_ORIGINS env var (comma-separated), falling
// back to appsettings.json, falling back to localhost for local dev. Set ALLOWED_ORIGINS
// on your host once the frontend is deployed — e.g. "https://team-outing.vercel.app".
const string CorsPolicy = "AllowFrontend";
var allowedOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (allowedOrigins.Length == 0)
    allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
        ?? new[] { "http://localhost:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers().AddJsonOptions(o =>
{
    // avoids circular-reference errors when returning nested Trip -> Games -> Teams -> Members
    o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // lets you paste a token into Swagger UI's "Authorize" button to test protected endpoints
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Paste the token returned from /api/auth/verify-otp, e.g.: 3fa1...",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

var app = builder.Build();

// Render (and similar hosts) assign a port via the PORT env var at runtime.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    app.Urls.Add($"http://0.0.0.0:{port}");

// ---- Apply schema on startup (no sample data seeded) ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// Swagger enabled in all environments for now — this is a prototype API, not yet
// exposed publicly. Restrict this back to IsDevelopment() before a real production launch.
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
