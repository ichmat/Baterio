using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.CustomFields;

namespace BackEnd.Tests;

public class CustomFieldsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CustomFieldsControllerTests(CustomWebApplicationFactory factory)
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

    private async Task<CustomFieldResponse> CreateTestFieldAsync(string token, string label = "Test Field",
        string fieldType = "Text", string obligationLevel = "Never",
        bool appliesToQuotes = true, bool appliesToSites = true, string? options = null)
    {
        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = label,
                FieldType = fieldType,
                ObligationLevel = obligationLevel,
                AppliesToQuotes = appliesToQuotes,
                AppliesToSites = appliesToSites,
                Options = options
            }));
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<CustomFieldResponse>>();
        return result!.Data;
    }

    // --- GET /api/custom-fields ---

    [Fact]
    public async Task GetAll_ReturnsFieldsForTenant()
    {
        var (token, _, _) = await SetupAdminAsync();
        await CreateTestFieldAsync(token, "GetAll Test");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/custom-fields", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<List<CustomFieldResponse>>>();
        Assert.NotNull(result);
        Assert.NotEmpty(result.Data);
    }

    [Fact]
    public async Task GetAll_WithAppliesToQuotesFilter_ReturnsFilteredFields()
    {
        var (token, _, _) = await SetupAdminAsync();
        await CreateTestFieldAsync(token, "Quotes Only", appliesToQuotes: true, appliesToSites: false);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get,
            "/api/custom-fields?appliesToQuotes=true", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<List<CustomFieldResponse>>>();
        Assert.NotNull(result);
        Assert.All(result.Data, f => Assert.True(f.AppliesToQuotes));
    }

    // --- POST /api/custom-fields ---

    [Fact]
    public async Task Create_ValidField_Returns201()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = "Surface m²",
                FieldType = "Number",
                ObligationLevel = "Never",
                AppliesToQuotes = true,
                AppliesToSites = true
            }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<CustomFieldResponse>>();
        Assert.NotNull(result);
        Assert.Equal("Surface m²", result.Data.Label);
        Assert.Equal(FieldType.Number, result.Data.FieldType);
        Assert.Equal(ObligationLevel.Never, result.Data.ObligationLevel);
    }

    [Fact]
    public async Task Create_NoAppliesToSelected_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = "Invalid Field",
                FieldType = "Text",
                ObligationLevel = "Never",
                AppliesToQuotes = false,
                AppliesToSites = false
            }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_InvalidFieldType_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = "Bad Type",
                FieldType = "InvalidType",
                ObligationLevel = "Never",
                AppliesToQuotes = true,
                AppliesToSites = true
            }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/custom-fields/{id} ---

    [Fact]
    public async Task Update_ModifyLabelAndObligation_Returns200()
    {
        var (token, _, _) = await SetupAdminAsync();
        var field = await CreateTestFieldAsync(token, "Original Label");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put,
            $"/api/custom-fields/{field.Id}", token,
            new UpdateCustomFieldRequest
            {
                Label = "Updated Label",
                ObligationLevel = "RequiredAtCreation"
            }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<CustomFieldResponse>>();
        Assert.NotNull(result);
        Assert.Equal("Updated Label", result.Data.Label);
        Assert.Equal(ObligationLevel.RequiredAtCreation, result.Data.ObligationLevel);
        Assert.NotNull(result.Data.UpdatedAt);
    }

    [Fact]
    public async Task Update_ChangeFieldType_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();
        var field = await CreateTestFieldAsync(token, "Type Lock Test");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put,
            $"/api/custom-fields/{field.Id}", token,
            new UpdateCustomFieldRequest
            {
                FieldType = "Number"
            }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- DELETE /api/custom-fields/{id} ---

    [Fact]
    public async Task Delete_ExistingField_Returns204()
    {
        var (token, _, _) = await SetupAdminAsync();
        var field = await CreateTestFieldAsync(token, "To Delete");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Delete,
            $"/api/custom-fields/{field.Id}", token));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // --- PUT /api/custom-fields/reorder ---

    [Fact]
    public async Task Reorder_UpdatesDisplayOrder()
    {
        var (token, _, _) = await SetupAdminAsync();
        var field1 = await CreateTestFieldAsync(token, "Reorder A");
        var field2 = await CreateTestFieldAsync(token, "Reorder B");

        // Get all current fields to build complete reorder list
        var allResponse = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/custom-fields", token));
        var allResult = await allResponse.Content.ReadFromJsonAsync<ApiResponse<List<CustomFieldResponse>>>();
        var allIds = allResult!.Data.Select(f => f.Id).ToList();

        // Swap field1 and field2 positions, keep others in place
        var idx1 = allIds.IndexOf(field1.Id);
        var idx2 = allIds.IndexOf(field2.Id);
        (allIds[idx1], allIds[idx2]) = (allIds[idx2], allIds[idx1]);

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put,
            "/api/custom-fields/reorder", token,
            new ReorderCustomFieldsRequest { FieldIds = allIds }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<List<CustomFieldResponse>>>();
        Assert.NotNull(result);
    }

    [Fact]
    public async Task Reorder_DuplicateIds_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();
        var field1 = await CreateTestFieldAsync(token, "Dup A");
        var field2 = await CreateTestFieldAsync(token, "Dup B");

        // Get all current fields
        var allResponse = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/custom-fields", token));
        var allResult = await allResponse.Content.ReadFromJsonAsync<ApiResponse<List<CustomFieldResponse>>>();
        var allIds = allResult!.Data.Select(f => f.Id).ToList();

        // Replace last ID with duplicate of first to keep same count
        allIds[^1] = allIds[0];

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put,
            "/api/custom-fields/reorder", token,
            new ReorderCustomFieldsRequest { FieldIds = allIds }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Reorder_MissingIds_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();
        await CreateTestFieldAsync(token, "Missing A");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Put,
            "/api/custom-fields/reorder", token,
            new ReorderCustomFieldsRequest { FieldIds = [99999] }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Options validation ---

    [Fact]
    public async Task Create_ChoiceType_InvalidJson_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = "Bad JSON",
                FieldType = "SingleChoice",
                ObligationLevel = "Never",
                AppliesToQuotes = true,
                AppliesToSites = true,
                Options = "not json"
            }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_ChoiceType_EmptyChoices_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = "Empty Choices",
                FieldType = "SingleChoice",
                ObligationLevel = "Never",
                AppliesToQuotes = true,
                AppliesToSites = true,
                Options = "{\"choices\":[]}"
            }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_ChoiceType_NullOptions_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = "No Options",
                FieldType = "MultipleChoice",
                ObligationLevel = "Never",
                AppliesToQuotes = true,
                AppliesToSites = true,
                Options = null
            }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_ChoiceType_InvalidChoiceContent_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = "Bad Choices",
                FieldType = "SingleChoice",
                ObligationLevel = "Never",
                AppliesToQuotes = true,
                AppliesToSites = true,
                Options = "{\"choices\":[\"Valid\", \"\", \"Also Valid\"]}"
            }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_NonChoiceType_WithOptions_Returns400()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Post, "/api/custom-fields", token,
            new CreateCustomFieldRequest
            {
                Label = "Text with options",
                FieldType = "Text",
                ObligationLevel = "Never",
                AppliesToQuotes = true,
                AppliesToSites = true,
                Options = "{\"choices\":[\"A\"]}"
            }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- GET /api/custom-fields/{id} ---

    [Fact]
    public async Task GetById_ExistingField_Returns200()
    {
        var (token, _, _) = await SetupAdminAsync();
        var field = await CreateTestFieldAsync(token, "GetById Test");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get,
            $"/api/custom-fields/{field.Id}", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<CustomFieldResponse>>();
        Assert.NotNull(result);
        Assert.Equal("GetById Test", result.Data.Label);
    }

    [Fact]
    public async Task GetById_NonExistent_Returns404()
    {
        var (token, _, _) = await SetupAdminAsync();

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get,
            "/api/custom-fields/99999", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Access control ---

    [Fact]
    public async Task GetAll_AsNonAdmin_Returns403()
    {
        var (tenantId, _) = await _factory.SeedTestDataAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var token = _factory.GenerateTestToken(ouvrierId, tenantId, UserRole.Ouvrier, "ouvrier@test.fr");

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get, "/api/custom-fields", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
