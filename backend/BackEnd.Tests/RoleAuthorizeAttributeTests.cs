using System.Net;
using System.Net.Http.Headers;

namespace BackEnd.Tests;

public class RoleAuthorizeAttributeTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public RoleAuthorizeAttributeTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AdminRole_CanAccessAdminEndpoint_Returns200()
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        var token = _factory.GenerateTestToken(userId, tenantId, BackEnd.Shared.Enums.UserRole.Admin);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task NonAdminRole_CannotAccessAdminEndpoint_Returns403()
    {
        var (tenantId, _) = await _factory.SeedTestDataAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var token = _factory.GenerateTestToken(ouvrierId, tenantId, BackEnd.Shared.Enums.UserRole.Ouvrier, "ouvrier@test.fr");

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task NoToken_CannotAccessAdminEndpoint_Returns401()
    {
        var response = await _client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
