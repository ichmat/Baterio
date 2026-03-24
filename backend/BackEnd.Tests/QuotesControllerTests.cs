using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Quotes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BackEnd.Tests;

public class QuotesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public QuotesControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int TenantId, int UserId, int CustomerId)> SetupAsync(UserRole role = UserRole.Chef, string email = "test@baterio.fr")
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();

        // Ensure a customer exists for quotes
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var customer = await db.Customers.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.LastName == "QuoteTestCustomer");

        if (customer == null)
        {
            customer = new Customer
            {
                TenantId = tenantId,
                LastName = "QuoteTestCustomer",
                FirstName = "Client",
                CreatedAt = DateTime.UtcNow
            };
            db.Customers.Add(customer);

            // Ensure CompanyInfo exists for legal mentions
            var companyExists = await db.CompanyInfos.IgnoreQueryFilters()
                .AnyAsync(c => c.TenantId == tenantId);
            if (!companyExists)
            {
                db.CompanyInfos.Add(new CompanyInfo
                {
                    TenantId = tenantId,
                    CompanyName = "Test SAS",
                    Siret = "12345678901234",
                    VatNumber = "FR12345678901",
                    DefaultPaymentTerms = "30 jours",
                    CreatedAt = DateTime.UtcNow
                });
            }

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

    // --- POST /api/quotes ---

    [Fact]
    public async Task Create_ValidData_Returns201WithQuoteResponse()
    {
        var (token, _, _, customerId) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/quotes", token,
            new CreateQuoteRequest { CustomerId = customerId, Subject = "Rénovation salle de bain" }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);
        Assert.NotNull(body);
        Assert.StartsWith("DEV-", body.Data.Reference);
        Assert.Equal("Draft", body.Data.Status);
        Assert.Equal("Rénovation salle de bain", body.Data.Subject);
    }

    [Fact]
    public async Task Create_WithLines_CalculatesTotals()
    {
        var (token, _, _, customerId) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/quotes", token,
            new CreateQuoteRequest
            {
                CustomerId = customerId,
                Subject = "Avec lignes",
                TaxRate = 20m,
                Lines =
                [
                    new QuoteLineRequest { Description = "Ligne 1", Quantity = 5, UnitPriceExclTax = 100m, DisplayOrder = 0 },
                    new QuoteLineRequest { Description = "Ligne 2", Quantity = 2, UnitPriceExclTax = 50m, DisplayOrder = 1 }
                ]
            }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);
        Assert.NotNull(body);
        Assert.Equal(600m, body.Data.AmountExclTax);  // 5*100 + 2*50
        Assert.Equal(720m, body.Data.AmountInclTax);   // 600 * 1.20
        Assert.Equal(2, body.Data.Lines.Count);
    }

    // --- GET /api/quotes ---

    [Fact]
    public async Task GetAll_ReturnsPaginatedList()
    {
        var (token, _, _, customerId) = await SetupAsync();

        // Create a quote
        await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/quotes", token,
            new CreateQuoteRequest { CustomerId = customerId, Subject = "List test" }));

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/quotes", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<PaginatedResponse<QuoteListResponse>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.True(body.Data.Data.Count >= 1);
        Assert.True(body.Data.Pagination.TotalItems >= 1);
    }

    // --- GET /api/quotes/{id} ---

    [Fact]
    public async Task GetById_ExistingQuote_Returns200WithLines()
    {
        var (token, _, _, customerId) = await SetupAsync();

        var createResponse = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/quotes", token,
            new CreateQuoteRequest
            {
                CustomerId = customerId,
                Subject = "GetById test",
                Lines = [new QuoteLineRequest { Description = "Ligne test", Quantity = 1, UnitPriceExclTax = 100m }]
            }));
        var created = await createResponse.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, $"/api/quotes/{created!.Data.Id}", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);
        Assert.NotNull(body);
        Assert.Equal("GetById test", body.Data.Subject);
        Assert.Single(body.Data.Lines);
    }

    [Fact]
    public async Task GetById_NonExisting_Returns404()
    {
        var (token, _, _, _) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/quotes/99999", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- PUT /api/quotes/{id} ---

    [Fact]
    public async Task Update_ValidData_Returns200()
    {
        var (token, _, _, customerId) = await SetupAsync();

        var createResponse = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/quotes", token,
            new CreateQuoteRequest { CustomerId = customerId, Subject = "Before update" }));
        var created = await createResponse.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put, $"/api/quotes/{created!.Data.Id}", token,
            new UpdateQuoteRequest
            {
                Subject = "After update",
                Lines = [new QuoteLineRequest { Description = "New line", Quantity = 3, UnitPriceExclTax = 100m }]
            }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);
        Assert.NotNull(body);
        Assert.Equal("After update", body.Data.Subject);
        Assert.Single(body.Data.Lines);
    }

    // --- PATCH /api/quotes/{id}/status ---

    [Fact]
    public async Task UpdateStatus_ValidTransition_Returns200()
    {
        var (token, _, _, customerId) = await SetupAsync();

        var createResponse = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/quotes", token,
            new CreateQuoteRequest { CustomerId = customerId, Subject = "Status test" }));
        var created = await createResponse.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Patch,
            $"/api/quotes/{created!.Data.Id}/status", token,
            new UpdateQuoteStatusRequest { Status = "Sent" }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);
        Assert.NotNull(body);
        Assert.Equal("Sent", body.Data.Status);
    }

    [Fact]
    public async Task UpdateStatus_InvalidTransition_Returns400()
    {
        var (token, _, _, customerId) = await SetupAsync();

        var createResponse = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/quotes", token,
            new CreateQuoteRequest { CustomerId = customerId, Subject = "Invalid transition test" }));
        var created = await createResponse.Content.ReadFromJsonAsync<ApiResponse<QuoteResponse>>(JsonOpts);

        // Try Draft → Accepted (invalid)
        var response = await _client.SendAsync(CreateRequest(HttpMethod.Patch,
            $"/api/quotes/{created!.Data.Id}/status", token,
            new UpdateQuoteStatusRequest { Status = "Accepted" }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- RBAC ---

    [Theory]
    [InlineData(UserRole.Chef)]
    [InlineData(UserRole.Secretaire)]
    public async Task Access_ChefAndSecretaire_Returns200(UserRole role)
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        var token = _factory.GenerateTestToken(userId, tenantId, role);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/quotes", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Access_Ouvrier_Returns403()
    {
        var (token, _, _, _) = await SetupAsync(UserRole.Ouvrier);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/quotes", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Access_Unauthenticated_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/quotes");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- GET /api/quotes/search ---

    private async Task<string> SetupWithQuotesAsync()
    {
        var (token, tenantId, userId, customerId) = await SetupAsync();

        // Create quotes for search tests
        var subjects = new[] { "Rénovation toiture", "Isolation combles", "Peinture garage" };
        foreach (var subject in subjects)
        {
            await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/quotes", token,
                new CreateQuoteRequest { CustomerId = customerId, Subject = subject }));
        }

        return token;
    }

    [Fact]
    public async Task Search_ValidQuery_ReturnsMatchingQuotes()
    {
        var token = await SetupWithQuotesAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/quotes/search?q=toiture", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<QuoteSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.True(body.Data.Count >= 1);
        Assert.All(body.Data, r => Assert.Contains("toiture", r.Subject, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Search_ShortQuery_ReturnsEmptyList()
    {
        var token = await SetupWithQuotesAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/quotes/search?q=a", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<QuoteSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.Empty(body.Data);
    }

    [Fact]
    public async Task Search_NoQuery_ReturnsEmptyList()
    {
        var token = await SetupWithQuotesAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/quotes/search", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<QuoteSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.Empty(body.Data);
    }

    [Fact]
    public async Task Search_WithLimit_RespectsLimit()
    {
        var token = await SetupWithQuotesAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/quotes/search?q=DEV-&limit=2", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<QuoteSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.True(body.Data.Count <= 2);
    }

    [Fact]
    public async Task Search_ByReference_ReturnsResult()
    {
        var token = await SetupWithQuotesAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/quotes/search?q=DEV-", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<QuoteSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.True(body.Data.Count >= 1);
        Assert.All(body.Data, r => Assert.StartsWith("DEV-", r.Reference));
    }

    [Fact]
    public async Task Search_ByCustomerName_ReturnsResult()
    {
        var token = await SetupWithQuotesAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/quotes/search?q=QuoteTestCustomer", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<QuoteSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.True(body.Data.Count >= 1);
    }

    [Fact]
    public async Task Search_Ouvrier_Returns403()
    {
        var (token, _, _, _) = await SetupAsync(UserRole.Ouvrier);

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/quotes/search?q=test", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
