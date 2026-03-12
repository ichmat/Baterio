using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Models.Users;
using Microsoft.Extensions.DependencyInjection;

namespace BackEnd.Tests;

public class UsersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public UsersControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int TenantId, int AdminId)> SetupAdminAsync()
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        var token = _factory.GenerateTestToken(userId, tenantId, UserRole.Admin);
        return (token, tenantId, userId);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string url, string token, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null)
            request.Content = JsonContent.Create(body);
        return request;
    }

    // --- GET /api/users ---

    [Fact]
    public async Task GetAll_AsAdmin_Returns200WithUserList()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/users", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("data", body);
    }

    [Fact]
    public async Task GetAll_AsNonAdmin_Returns403()
    {
        var (tenantId, _) = await _factory.SeedTestDataAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var token = _factory.GenerateTestToken(ouvrierId, tenantId, UserRole.Ouvrier, "ouvrier@test.fr");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/users", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- GET /api/users/{id} ---

    [Fact]
    public async Task GetById_ExistingUser_Returns200()
    {
        var (token, _, adminId) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, $"/api/users/{adminId}", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("test@baterio.fr", body);
    }

    [Fact]
    public async Task GetById_NonExistingUser_Returns404()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/users/99999", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/users ---

    [Fact]
    public async Task Create_ValidData_Returns201()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/users", token, new CreateUserRequest
        {
            Email = $"new-{Guid.NewGuid():N}@baterio.fr",
            FirstName = "Nouveau",
            LastName = "Utilisateur",
            Password = "Password123!",
            Role = UserRole.Chef
        }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Nouveau", body);
        Assert.Contains("Chef", body);
    }

    [Fact]
    public async Task Create_DuplicateEmail_Returns409()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/users", token, new CreateUserRequest
        {
            Email = "test@baterio.fr",
            FirstName = "Duplicate",
            LastName = "User",
            Password = "Password123!",
            Role = UserRole.Chef
        }));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("email existe", body);
    }

    [Fact]
    public async Task Create_ExceedingUserLimit_Returns403()
    {
        var (token, tenantId, _) = await SetupAdminAsync();

        // Set tenant max to 2 (admin + ouvrier already exist)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BackEnd.API.Data.AppDbContext>();
            var tenant = await db.Tenants.FindAsync(tenantId);
            tenant!.Configuration = "{\"maxUsers\": 2}";
            await db.SaveChangesAsync();
        }

        try
        {
            var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/users", token, new CreateUserRequest
            {
                Email = $"limit-{Guid.NewGuid():N}@baterio.fr",
                FirstName = "Limit",
                LastName = "User",
                Password = "Password123!",
                Role = UserRole.Ouvrier
            }));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("limite", body);
        }
        finally
        {
            // Restore original configuration to avoid polluting other tests
            using var restoreScope = _factory.Services.CreateScope();
            var restoreDb = restoreScope.ServiceProvider.GetRequiredService<BackEnd.API.Data.AppDbContext>();
            var restoreTenant = await restoreDb.Tenants.FindAsync(tenantId);
            restoreTenant!.Configuration = "{\"maxUsers\": 10}";
            await restoreDb.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Create_WithAdminRole_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/users", token, new CreateUserRequest
        {
            Email = $"admin-{Guid.NewGuid():N}@baterio.fr",
            FirstName = "New",
            LastName = "Admin",
            Password = "Password123!",
            Role = UserRole.Admin
        }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PATCH /api/users/{id}/role ---

    [Fact]
    public async Task UpdateRole_ValidData_Returns200()
    {
        var (token, _, _) = await SetupAdminAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Patch, $"/api/users/{ouvrierId}/role", token, new UpdateUserRoleRequest
        {
            Role = UserRole.Chef
        }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Chef", body);
    }

    [Fact]
    public async Task UpdateRole_ToAdmin_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Patch, $"/api/users/{ouvrierId}/role", token, new UpdateUserRoleRequest
        {
            Role = UserRole.Admin
        }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateRole_Self_Returns400()
    {
        var (token, _, adminId) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Patch, $"/api/users/{adminId}/role", token, new UpdateUserRoleRequest
        {
            Role = UserRole.Chef
        }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("CannotChangeOwnRole", body);
    }

    // --- PATCH /api/users/{id}/deactivate ---

    [Fact]
    public async Task Deactivate_OtherUser_Returns204()
    {
        var (token, _, _) = await SetupAdminAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Patch, $"/api/users/{ouvrierId}/deactivate", token));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Deactivate_Self_Returns400()
    {
        var (token, _, adminId) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Patch, $"/api/users/{adminId}/deactivate", token));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("propre compte", body);
    }

    // --- PATCH /api/users/{id}/reactivate ---

    [Fact]
    public async Task Reactivate_DeactivatedUser_Returns204()
    {
        var (token, _, _) = await SetupAdminAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();

        // Deactivate first
        await _client.SendAsync(CreateRequest(HttpMethod.Patch, $"/api/users/{ouvrierId}/deactivate", token));

        // Reactivate
        var response = await _client.SendAsync(CreateRequest(HttpMethod.Patch, $"/api/users/{ouvrierId}/reactivate", token));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
