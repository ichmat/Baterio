using System.Net;
using System.Net.Http.Headers;

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
        var token = _factory.GenerateTestToken(userId, tenantId);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        // Logout should succeed (204), proving tenant middleware + auth worked
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
