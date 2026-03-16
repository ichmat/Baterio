using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Models.Audit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BackEnd.Tests;

public class AuditEventsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuditEventsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int TenantId, int UserId)> SetupAsync(UserRole role = UserRole.Admin)
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        if (role == UserRole.Admin)
        {
            var token = _factory.GenerateTestToken(userId, tenantId, UserRole.Admin);
            return (token, tenantId, userId);
        }
        else
        {
            var ouvrierId = await _factory.GetOuvrierUserIdAsync();
            var token = _factory.GenerateTestToken(ouvrierId, tenantId, role, "ouvrier@test.fr");
            return (token, tenantId, ouvrierId);
        }
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private async Task SeedAuditEventsAsync(int tenantId, int userId, string entityType = "User", int entityId = 42, int count = 3)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BackEnd.API.Data.AppDbContext>();

        for (var i = 0; i < count; i++)
        {
            db.AuditEvents.Add(new BackEnd.Shared.Entities.AuditEvent
            {
                EntityType = entityType,
                EntityId = entityId,
                TenantId = tenantId,
                UserId = userId,
                Action = AuditAction.Created,
                Payload = $"{{\"index\":{i}}}",
                CreatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        }
        await db.SaveChangesAsync();
    }

    // --- GET /api/audit-events ---

    [Fact]
    public async Task GetEvents_WithValidParams_ReturnsFilteredEvents()
    {
        var (token, tenantId, userId) = await SetupAsync();
        await SeedAuditEventsAsync(tenantId, userId);

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/audit-events?entityType=User&entityId=42", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("data", body);
        Assert.Contains("pagination", body);
        Assert.Contains("totalItems", body);
    }

    [Fact]
    public async Task GetEvents_WithPagination_ReturnsPaginatedResponse()
    {
        var (token, tenantId, userId) = await SetupAsync();
        await SeedAuditEventsAsync(tenantId, userId, count: 5);

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/audit-events?entityType=User&entityId=42&page=1&pageSize=2", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("pagination", body);
        Assert.Contains("page", body);
        Assert.Contains("pageSize", body);
    }

    [Theory]
    [InlineData(UserRole.Admin)]
    [InlineData(UserRole.Chef)]
    [InlineData(UserRole.Secretaire)]
    [InlineData(UserRole.Ouvrier)]
    public async Task GetEvents_AllAuthenticatedRoles_Returns200(UserRole role)
    {
        var (tenantId, _) = await _factory.SeedTestDataAsync();
        var (userId, email) = await GetOrCreateUserForRoleAsync(tenantId, role);

        var token = _factory.GenerateTestToken(userId, tenantId, role, email);
        await SeedAuditEventsAsync(tenantId, userId);

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/audit-events?entityType=User&entityId=42", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetEvents_Unauthenticated_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/audit-events?entityType=User&entityId=42");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetEvents_MissingEntityType_Returns400()
    {
        var (token, _, _) = await SetupAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/audit-events?entityId=42", token));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("AuditEntityTypeRequired", body);
    }

    [Fact]
    public async Task GetEvents_MissingEntityId_Returns400()
    {
        var (token, _, _) = await SetupAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/audit-events?entityType=User", token));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("AuditEntityIdRequired", body);
    }

    private async Task<int> GetUserByEmailAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BackEnd.API.Data.AppDbContext>();
        var user = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == email);
        return user.Id;
    }

    private async Task<(int UserId, string Email)> GetOrCreateUserForRoleAsync(int tenantId, UserRole role)
    {
        var email = role switch
        {
            UserRole.Admin => "test@baterio.fr",
            UserRole.Ouvrier => "ouvrier@test.fr",
            UserRole.Chef => "chef@test.fr",
            UserRole.Secretaire => "secretaire@test.fr",
            _ => throw new ArgumentOutOfRangeException(nameof(role))
        };

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BackEnd.API.Data.AppDbContext>();

        var existing = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == email);
        if (existing != null)
            return (existing.Id, email);

        var user = new BackEnd.Shared.Entities.User
        {
            TenantId = tenantId,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"),
            FirstName = role.ToString(),
            LastName = "Test",
            Role = role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return (user.Id, email);
    }
}
