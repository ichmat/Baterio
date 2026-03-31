using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Sites;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BackEnd.Tests;

public class SitesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SitesControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int TenantId, int UserId, int CustomerId)> SetupAsync(UserRole role = UserRole.Chef, string email = "sitetest@baterio.fr")
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var customer = await db.Customers.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.LastName == "SiteTestCustomer");

        if (customer == null)
        {
            customer = new Customer
            {
                TenantId = tenantId,
                LastName = "SiteTestCustomer",
                FirstName = "Client",
                CreatedAt = DateTime.UtcNow
            };
            db.Customers.Add(customer);
            await db.SaveChangesAsync();
        }

        if (role == UserRole.Chef || role == UserRole.Secretaire || role == UserRole.Admin)
        {
            var token = _factory.GenerateTestToken(userId, tenantId, role, email);
            return (token, tenantId, userId, customer.Id);
        }

        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var ouvrierToken = _factory.GenerateTestToken(ouvrierId, tenantId, role, "ouvrier@test.fr");
        return (ouvrierToken, tenantId, ouvrierId, customer.Id);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string url, string token, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null)
            request.Content = JsonContent.Create(body);
        return request;
    }

    // --- POST /api/sites ---

    [Fact]
    public async Task Create_ValidData_Returns201WithSiteResponse()
    {
        var (token, _, _, customerId) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/sites", token,
            new CreateSiteRequest { CustomerId = customerId, Subject = "Rénovation toiture", SiteAddress = "5 avenue des Champs" }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<SiteResponse>>(JsonOpts);
        Assert.NotNull(body);
        Assert.NotNull(body.Data);
        Assert.StartsWith("CH-", body.Data.Reference);
        Assert.Equal("Planned", body.Data.Status);
    }

    // --- GET /api/sites/:id ---

    [Fact]
    public async Task GetById_ExistingSite_Returns200()
    {
        var (token, _, _, customerId) = await SetupAsync();

        // Create a site first
        var createResponse = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/sites", token,
            new CreateSiteRequest { CustomerId = customerId, Subject = "Chantier test GET", SiteAddress = "10 rue Test" }));
        var created = await createResponse.Content.ReadFromJsonAsync<ApiResponse<SiteResponse>>(JsonOpts);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, $"/api/sites/{created!.Data.Id}", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<SiteResponse>>(JsonOpts);
        Assert.Equal("Chantier test GET", body!.Data.Subject);
    }

    [Fact]
    public async Task GetById_NotFound_Returns404()
    {
        var (token, _, _, _) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/sites/99999", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/sites/search ---

    [Fact]
    public async Task Search_ReturnsMatchingResults()
    {
        var (token, _, _, customerId) = await SetupAsync();

        // Create a site
        await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/sites", token,
            new CreateSiteRequest { CustomerId = customerId, Subject = "Peinture salon unique", SiteAddress = "3 rue Bleue" }));

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/sites/search?q=Peinture+salon", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<SiteSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.NotEmpty(body.Data);
    }

    // --- DELETE /api/sites/:id ---

    [Fact]
    public async Task Delete_ExistingSite_Returns204()
    {
        var (token, _, _, customerId) = await SetupAsync();

        var createResponse = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/sites", token,
            new CreateSiteRequest { CustomerId = customerId, Subject = "Chantier à supprimer", SiteAddress = "1 rue Test" }));
        var created = await createResponse.Content.ReadFromJsonAsync<ApiResponse<SiteResponse>>(JsonOpts);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Delete, $"/api/sites/{created!.Data.Id}", token));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_NotFound_Returns404()
    {
        var (token, _, _, _) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Delete, "/api/sites/99999", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/sites/by-customer/:customerId ---

    [Fact]
    public async Task GetByCustomer_ReturnsCustomerSites()
    {
        var (token, _, _, customerId) = await SetupAsync();

        await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/sites", token,
            new CreateSiteRequest { CustomerId = customerId, Subject = "Chantier client", SiteAddress = "2 rue Client" }));

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, $"/api/sites/by-customer/{customerId}", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<SiteSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.NotEmpty(body.Data);
    }
}
