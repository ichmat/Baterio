using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Models.Company;

namespace BackEnd.Tests;

public class CompanyControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CompanyControllerTests(CustomWebApplicationFactory factory)
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

    // --- GET /api/company ---

    [Fact]
    public async Task GetCompanyInfo_NoDataYet_Returns200WithEmptyResponse()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/company", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("data", body);
    }

    // --- PUT /api/company ---

    [Fact]
    public async Task UpdateCompanyInfo_InitialCreation_Returns200()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put, "/api/company", token, new UpdateCompanyInfoRequest
        {
            CompanyName = "Test SARL",
            Address = "1 rue de Test, 75001 Paris",
            Siret = "12345678901234",
            VatNumber = "FR12345678901",
            LegalForm = "SARL",
            InsurancePolicyNumber = "DEC-2024-999",
            InsuranceProvider = "AXA",
            InsuranceCoverage = "France",
            DefaultPaymentTerms = "Paiement a 30 jours"
        }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Test SARL", body);
        Assert.Contains("12345678901234", body);
    }

    [Fact]
    public async Task UpdateCompanyInfo_UpdateExisting_Returns200()
    {
        var (token, _, _) = await SetupAdminAsync();

        // Create initial
        await _client.SendAsync(CreateRequest(HttpMethod.Put, "/api/company", token, new UpdateCompanyInfoRequest
        {
            CompanyName = "Initial SARL"
        }));

        // Update
        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put, "/api/company", token, new UpdateCompanyInfoRequest
        {
            CompanyName = "Updated SAS",
            LegalForm = "SAS"
        }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Updated SAS", body);
        Assert.Contains("SAS", body);
    }

    // --- GET /api/company/subscription ---

    [Fact]
    public async Task GetSubscriptionInfo_Returns200WithPlanAndUsers()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/company/subscription", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("data", body);
        Assert.Contains("Test Tenant", body);
    }

    // --- Access control ---

    [Fact]
    public async Task GetCompanyInfo_AsNonAdmin_Returns403()
    {
        var (tenantId, _) = await _factory.SeedTestDataAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var token = _factory.GenerateTestToken(ouvrierId, tenantId, UserRole.Ouvrier, "ouvrier@test.fr");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/company", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateCompanyInfo_AsNonAdmin_Returns403()
    {
        var (tenantId, _) = await _factory.SeedTestDataAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var token = _factory.GenerateTestToken(ouvrierId, tenantId, UserRole.Ouvrier, "ouvrier@test.fr");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put, "/api/company", token, new UpdateCompanyInfoRequest
        {
            CompanyName = "Hack SARL"
        }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetSubscriptionInfo_AsNonAdmin_Returns403()
    {
        var (tenantId, _) = await _factory.SeedTestDataAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var token = _factory.GenerateTestToken(ouvrierId, tenantId, UserRole.Ouvrier, "ouvrier@test.fr");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/company/subscription", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
