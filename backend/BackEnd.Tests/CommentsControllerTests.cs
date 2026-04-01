using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BackEnd.Tests;

public class CommentsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CommentsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int TenantId, int UserId, int QuoteId, int SiteId)> SetupAsync(UserRole role = UserRole.Chef)
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Ensure a customer exists
        var customer = await db.Customers.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.LastName == "CommentTestCustomer");
        if (customer == null)
        {
            customer = new Customer
            {
                TenantId = tenantId,
                LastName = "CommentTestCustomer",
                FirstName = "Client",
                CreatedAt = DateTime.UtcNow
            };
            db.Customers.Add(customer);
            await db.SaveChangesAsync();
        }

        // Ensure a quote exists
        var quote = await db.Quotes.IgnoreQueryFilters()
            .FirstOrDefaultAsync(q => q.TenantId == tenantId && q.Subject == "CommentTestQuote");
        if (quote == null)
        {
            quote = new Quote
            {
                TenantId = tenantId,
                CustomerId = customer.Id,
                Subject = "CommentTestQuote",
                Reference = "DEV-COMMENT-001",
                Status = QuoteStatus.Draft,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };
            db.Quotes.Add(quote);
            await db.SaveChangesAsync();
        }

        // Ensure a site exists
        var site = await db.Sites.IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Subject == "CommentTestSite");
        if (site == null)
        {
            site = new Site
            {
                TenantId = tenantId,
                CustomerId = customer.Id,
                Subject = "CommentTestSite",
                Reference = "CH-COMMENT-001",
                SiteAddress = "1 rue Test",
                Status = SiteStatus.Planned,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };
            db.Sites.Add(site);
            await db.SaveChangesAsync();
        }

        var token = _factory.GenerateTestToken(userId, tenantId, role);
        return (token, tenantId, userId, quote.Id, site.Id);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string url, string token, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null)
        {
            request.Content = new StringContent(
                JsonSerializer.Serialize(body, JsonOpts),
                Encoding.UTF8, "application/json");
        }
        return request;
    }

    [Fact]
    public async Task Add_ValidContent_Returns201()
    {
        var (token, _, _, quoteId, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token,
            new { content = "Ceci est un commentaire de test" });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Ceci est un commentaire de test", body);
        Assert.Contains("userFullName", body);
        Assert.Contains("createdAt", body);
    }

    [Fact]
    public async Task Add_EmptyContent_Returns400()
    {
        var (token, _, _, quoteId, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token,
            new { content = "   " });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("CommentContentRequired", body);
    }

    [Fact]
    public async Task Add_ContentTooLong_Returns400()
    {
        var (token, _, _, quoteId, _) = await SetupAsync();

        var longContent = new string('A', 2001);
        var request = CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token,
            new { content = longContent });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("CommentContentTooLong", body);
    }

    [Fact]
    public async Task Add_NonExistentEntity_Returns404()
    {
        var (token, _, _, _, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post,
            "/api/comments?entityType=Quote&entityId=99999", token,
            new { content = "Commentaire sur entite inexistante" });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("QuoteNotFound", body);
    }

    [Fact]
    public async Task Add_UnsupportedEntityType_Returns400()
    {
        var (token, _, _, _, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post,
            "/api/comments?entityType=Invoice&entityId=1", token,
            new { content = "Commentaire sur type non supporte" });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("CommentEntityTypeNotSupported", body);
    }

    // --- Site comments ---

    [Fact]
    public async Task Add_Site_ValidContent_Returns201()
    {
        var (token, _, _, _, siteId) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Site&entityId={siteId}", token,
            new { content = "Commentaire sur chantier" });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Commentaire sur chantier", body);
    }

    [Fact]
    public async Task Add_Site_CreatesAuditEvent()
    {
        var (token, _, _, _, siteId) = await SetupAsync();

        await _client.SendAsync(CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Site&entityId={siteId}", token,
            new { content = "Commentaire audit site" }));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditEvent = await db.AuditEvents.IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.EntityType == "Site" && e.EntityId == siteId
                && e.Action == AuditAction.CommentAdded
                && e.Payload != null && e.Payload.Contains("Commentaire audit site"));

        Assert.NotNull(auditEvent);
    }

    [Fact]
    public async Task Add_Site_NonExistentEntity_Returns404()
    {
        var (token, _, _, _, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post,
            "/api/comments?entityType=Site&entityId=99999", token,
            new { content = "Commentaire sur site inexistant" });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("SiteNotFound", body);
    }

    [Fact]
    public async Task Add_EmptyEntityType_Returns400()
    {
        var (token, _, _, _, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post,
            "/api/comments?entityId=1", token,
            new { content = "Test" });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Get_ReturnsPaginatedComments()
    {
        var (token, _, _, quoteId, _) = await SetupAsync();

        // Add two comments
        await _client.SendAsync(CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token,
            new { content = "Premier commentaire" }));
        await _client.SendAsync(CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token,
            new { content = "Deuxieme commentaire" }));

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Premier commentaire", body);
        Assert.Contains("Deuxieme commentaire", body);
        Assert.Contains("pagination", body);
    }

    [Fact]
    public async Task Get_PageZero_ReturnsLastPage()
    {
        var (token, _, _, quoteId, _) = await SetupAsync();

        // Add a comment so there is data
        await _client.SendAsync(CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token,
            new { content = "Commentaire page zero" }));

        var response = await _client.SendAsync(CreateRequest(HttpMethod.Get,
            $"/api/comments?entityType=Quote&entityId={quoteId}&page=0", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Commentaire page zero", body);
        // page should be resolved to the actual last page (1 in this case)
        Assert.Contains("\"page\":1", body);
    }

    [Fact]
    public async Task Delete_ExistingComment_Returns204()
    {
        var (token, _, _, quoteId, _) = await SetupAsync();

        // Add a comment first
        await _client.SendAsync(CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token,
            new { content = "Commentaire a supprimer" }));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var comment = await db.Comments.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Content == "Commentaire a supprimer");
        Assert.NotNull(comment);

        var deleteResponse = await _client.SendAsync(
            CreateRequest(HttpMethod.Delete, $"/api/comments/{comment.Id}", token));

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Delete_NonExistent_Returns404()
    {
        var (token, _, _, _, _) = await SetupAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Delete, "/api/comments/99999", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Add_CreatesAuditEvent()
    {
        var (token, _, _, quoteId, _) = await SetupAsync();

        await _client.SendAsync(CreateRequest(HttpMethod.Post,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token,
            new { content = "Commentaire audit test" }));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditEvent = await db.AuditEvents.IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.EntityType == "Quote" && e.EntityId == quoteId
                && e.Action == AuditAction.CommentAdded);

        Assert.NotNull(auditEvent);
        Assert.Contains("Commentaire audit test", auditEvent.Payload!);
    }

    [Fact]
    public async Task Unauthenticated_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/comments?entityType=Quote&entityId=1");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Ouvrier_Returns403()
    {
        var (_, tenantId, _, quoteId, _) = await SetupAsync();
        var ouvrierId = await _factory.GetOuvrierUserIdAsync();
        var token = _factory.GenerateTestToken(ouvrierId, tenantId, UserRole.Ouvrier, "ouvrier@test.fr");

        var request = CreateRequest(HttpMethod.Get,
            $"/api/comments?entityType=Quote&entityId={quoteId}", token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
