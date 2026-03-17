using System.Data.Common;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace BackEnd.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string TestJwtSecret = "test-secret-key-minimum-32-chars-long!";
    public const string TestJwtIssuer = "baterio-api";
    public const string TestJwtAudience = "baterio-frontend";

    private DbConnection? _connection;
    private string? _uploadTempDir;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _uploadTempDir = Path.Combine(Path.GetTempPath(), $"baterio-test-uploads-{Guid.NewGuid()}");
        Directory.CreateDirectory(_uploadTempDir);

        builder.UseEnvironment("Testing");

        builder.UseSetting("Jwt:Secret", TestJwtSecret);
        builder.UseSetting("Jwt:Issuer", TestJwtIssuer);
        builder.UseSetting("Jwt:Audience", TestJwtAudience);
        builder.UseSetting("Jwt:ExpirationInMinutes", "30");
        builder.UseSetting("FileStorage:BasePath", _uploadTempDir);

        builder.ConfigureServices(services =>
        {
            // Remove all existing DbContext registrations (options + MySQL provider services)
            var descriptorsToRemove = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                    || d.ServiceType == typeof(DbContextOptions)
                    || d.ServiceType.FullName?.Contains("EntityFrameworkCore") == true)
                .ToList();
            foreach (var d in descriptorsToRemove)
                services.Remove(d);

            // Create and keep open a shared SQLite in-memory connection
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(_connection));
        });
    }

    public async Task<(int TenantId, int UserId)> SeedTestDataAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();

        // Check if already seeded
        if (await db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Name == "Test Tenant"))
        {
            var existingTenant = await db.Tenants.IgnoreQueryFilters().FirstAsync(t => t.Name == "Test Tenant");
            var existingUser = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == "test@baterio.fr");
            return (existingTenant.Id, existingUser.Id);
        }

        var tenant = new Tenant { Name = "Test Tenant", Configuration = "{\"maxUsers\": 10}", CreatedAt = DateTime.UtcNow };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        var user = new User
        {
            TenantId = tenant.Id,
            Email = "test@baterio.fr",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"),
            FirstName = "Test",
            LastName = "User",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);

        var ouvrier = new User
        {
            TenantId = tenant.Id,
            Email = "ouvrier@test.fr",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Ouvrier123!"),
            FirstName = "Ouvrier",
            LastName = "Test",
            Role = UserRole.Ouvrier,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(ouvrier);

        await db.SaveChangesAsync();

        return (tenant.Id, user.Id);
    }

    public async Task<int> GetOuvrierUserIdAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ouvrier = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == "ouvrier@test.fr");
        return ouvrier.Id;
    }

    public string GenerateTestToken(int userId, int tenantId, UserRole role = UserRole.Admin, string email = "test@baterio.fr")
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim(ClaimTypes.Role, role.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: TestJwtIssuer,
            audience: TestJwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection?.Dispose();
            if (_uploadTempDir != null && Directory.Exists(_uploadTempDir))
                Directory.Delete(_uploadTempDir, true);
        }
    }
}
