using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BackEnd.Shared.Models.Auth;

namespace BackEnd.Tests;

public class AuthControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_WithValidCredentials_Returns200WithTokens()
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "test@baterio.fr",
            Password = "Test123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(result);
        Assert.NotEmpty(result.AccessToken);
        Assert.NotEmpty(result.RefreshToken);
        Assert.Equal("test@baterio.fr", result.User.Email);
        Assert.Equal(tenantId, result.User.TenantId);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_Returns401()
    {
        await _factory.SeedTestDataAsync();

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "test@baterio.fr",
            Password = "WrongPassword!"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Email ou mot de passe incorrect", body);
    }

    [Fact]
    public async Task Login_WithNonExistentEmail_Returns401()
    {
        await _factory.SeedTestDataAsync();

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "nonexistent@baterio.fr",
            Password = "Test123!"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithValidToken_Returns200WithNewTokens()
    {
        await _factory.SeedTestDataAsync();

        // First login to get a refresh token
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "test@baterio.fr",
            Password = "Test123!"
        });
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

        // Use refresh token
        var refreshResponse = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest
        {
            RefreshToken = loginResult!.RefreshToken
        });

        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

        var refreshResult = await refreshResponse.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(refreshResult);
        Assert.NotEmpty(refreshResult.AccessToken);
        Assert.NotEmpty(refreshResult.RefreshToken);
        // Rotation: new refresh token should be different
        Assert.NotEqual(loginResult.RefreshToken, refreshResult.RefreshToken);
    }

    [Fact]
    public async Task Refresh_WithInvalidToken_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest
        {
            RefreshToken = "invalid-token"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_WithValidToken_Returns204()
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        var token = _factory.GenerateTestToken(userId, tenantId);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Logout_WithoutToken_Returns401()
    {
        var response = await _client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
