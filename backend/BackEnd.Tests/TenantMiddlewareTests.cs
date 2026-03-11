using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BackEnd.Shared.Models.Auth;

namespace BackEnd.Tests;

public class TenantMiddlewareTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public TenantMiddlewareTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PublicRoute_Health_NoAuthRequired()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task PublicRoute_Login_NoAuthRequired()
    {
        var response = await _client.PostAsync("/api/auth/login",
            new StringContent("{\"email\":\"a@b.c\",\"password\":\"x\"}", System.Text.Encoding.UTF8, "application/json"));

        // Should not be 401 from middleware — will be 401 from auth logic (InvalidCredentials)
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("InvalidCredentials", body);
    }

    [Fact]
    public async Task AuthenticatedRequest_TenantExtractedFromJwt()
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();

        // Login to get a real access token (proves full pipeline works)
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "test@baterio.fr",
            Password = "Test123!"
        });
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

        // Use the real access token to logout — this proves:
        // 1. TenantMiddleware extracted tenant_id from JWT
        // 2. ITenantContext was populated (needed for query filter)
        // 3. The full auth pipeline works end-to-end
        var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        logoutRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginResult!.AccessToken);

        var response = await _client.SendAsync(logoutRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify the refresh token was actually revoked (proves tenant context was set)
        var refreshResponse = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest
        {
            RefreshToken = loginResult.RefreshToken
        });
        Assert.Equal(HttpStatusCode.Unauthorized, refreshResponse.StatusCode);
    }
}
