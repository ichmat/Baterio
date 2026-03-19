using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Customers;

namespace BackEnd.Tests;

public class CustomersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CustomersControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int TenantId, int UserId)> SetupAsync(UserRole role = UserRole.Chef, string email = "test@baterio.fr")
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        if (role == UserRole.Chef || role == UserRole.Secretaire || role == UserRole.Admin)
        {
            var token = _factory.GenerateTestToken(userId, tenantId, role, email);
            return (token, tenantId, userId);
        }
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var ouvrierToken = _factory.GenerateTestToken(ouvrierId, tenantId, role, "ouvrier@test.fr");
        return (ouvrierToken, tenantId, ouvrierId);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string url, string token, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null)
            request.Content = JsonContent.Create(body);
        return request;
    }

    // --- POST /api/customers ---

    [Fact]
    public async Task Create_ValidData_Returns201()
    {
        var (token, _, _) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/customers", token,
            new CreateCustomerRequest { LastName = "Dupont", FirstName = "Jean", Telephone = "0601020304", Email = "jean@dupont.fr" }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Dupont", body);
        Assert.Contains("Jean", body);
    }

    // --- GET /api/customers ---

    [Fact]
    public async Task GetAll_ReturnsList()
    {
        var (token, _, _) = await SetupAsync();

        // Create a customer first
        await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/customers", token,
            new CreateCustomerRequest { LastName = "ListTest", FirstName = "Client" }));

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/customers", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("data", body);
    }

    // --- GET /api/customers/{id} ---

    [Fact]
    public async Task GetById_ExistingCustomer_Returns200()
    {
        var (token, _, _) = await SetupAsync();

        // Create a customer
        var createResponse = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/customers", token,
            new CreateCustomerRequest { LastName = "GetTest", FirstName = "Client" }));
        var created = await createResponse.Content.ReadFromJsonAsync<ApiResponse<CustomerResponse>>(JsonOpts);
        var id = created!.Data.Id;

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, $"/api/customers/{id}", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("GetTest", body);
    }

    [Fact]
    public async Task GetById_NonExisting_Returns404()
    {
        var (token, _, _) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/customers/99999", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- PUT /api/customers/{id} ---

    [Fact]
    public async Task Update_ValidData_Returns200()
    {
        var (token, _, _) = await SetupAsync();

        // Create a customer
        var createResponse = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/customers", token,
            new CreateCustomerRequest { LastName = "UpdateTest", FirstName = "Client" }));
        var created = await createResponse.Content.ReadFromJsonAsync<ApiResponse<CustomerResponse>>(JsonOpts);
        var id = created!.Data.Id;

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put, $"/api/customers/{id}", token,
            new UpdateCustomerRequest { LastName = "Updated", FirstName = "Client" }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Updated", body);
    }

    // --- RBAC ---

    [Theory]
    [InlineData(UserRole.Chef)]
    [InlineData(UserRole.Secretaire)]
    public async Task Access_ChefAndSecretaire_Returns200(UserRole role)
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        var token = _factory.GenerateTestToken(userId, tenantId, role);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/customers", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Access_Ouvrier_Returns403()
    {
        var (token, _, _) = await SetupAsync(UserRole.Ouvrier);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/customers", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Access_Unauthenticated_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/customers");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- GET /api/customers/search ---

    [Fact]
    public async Task Search_ValidQuery_ReturnsMatchingCustomers()
    {
        var (token, _, _) = await SetupAsync();

        // Create customers
        await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/customers", token,
            new CreateCustomerRequest { LastName = "Lefebvre", FirstName = "Marie" }));
        await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/customers", token,
            new CreateCustomerRequest { LastName = "Dupont", FirstName = "Jean" }));

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/customers/search?q=Lef", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<CustomerSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.True(body.Data.Count >= 1);
        Assert.All(body.Data, r => Assert.Contains("Lef", r.LastName, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Search_EmptyQuery_ReturnsEmptyList()
    {
        var (token, _, _) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/customers/search?q=", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<CustomerSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.Empty(body.Data);
    }

    [Fact]
    public async Task Search_WithLimit_ReturnsMaxLimitResults()
    {
        var (token, _, _) = await SetupAsync();

        // Create 3 customers with same prefix
        for (int i = 0; i < 3; i++)
            await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/customers", token,
                new CreateCustomerRequest { LastName = $"SearchLimit{i}", FirstName = "Test" }));

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/customers/search?q=SearchLimit&limit=2", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<CustomerSearchResult>>>(JsonOpts);
        Assert.NotNull(body);
        Assert.Equal(2, body.Data.Count);
    }

    [Fact]
    public async Task Search_Ouvrier_Returns403()
    {
        var (token, _, _) = await SetupAsync(UserRole.Ouvrier);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/customers/search?q=Test", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Search_Unauthenticated_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/customers/search?q=Test");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_EmptyLastName_Returns400()
    {
        var (token, _, _) = await SetupAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/customers", token,
            new CreateCustomerRequest { LastName = "", FirstName = "Jean" }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
