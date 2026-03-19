using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BackEnd.API.Data;
using BackEnd.API.Infrastructure;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BackEnd.Tests;

public class TransactionMiddlewareTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public TransactionMiddlewareTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    /// <summary>
    /// 18.1 — A successful mutation + audit event are both persisted (commit)
    /// </summary>
    [Fact]
    public async Task MutationSuccess_BothEntityAndAuditEventPersisted()
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        var token = _factory.GenerateTestToken(userId, tenantId, UserRole.Admin);
        var client = _factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Put, "/api/company");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new
        {
            CompanyName = "TransactionTestCo",
            Address = "123 Test St"
        });

        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify both entity and audit event were committed
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var company = await db.CompanyInfos.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.CompanyName == "TransactionTestCo");
        Assert.NotNull(company);

        var auditEvent = await db.AuditEvents.IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.EntityType == "CompanyInfo" && e.EntityId == company.Id);
        Assert.NotNull(auditEvent);
    }

    /// <summary>
    /// 18.2 — If the pipeline throws after a SaveChanges, the transaction is rolled back (atomicity)
    /// Unit-level test of the middleware with a controlled failure scenario.
    /// </summary>
    [Fact]
    public async Task PipelineFailure_MutationIsRolledBack()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var tenantContext = new TestTenantContext { TenantId = 1 };
        using var setupDb = new AppDbContext(options, tenantContext);
        setupDb.Database.EnsureCreated();

        // Seed required tenant + user (FK constraints)
        setupDb.Tenants.Add(new Tenant { Name = "Test", CreatedAt = DateTime.UtcNow });
        setupDb.SaveChanges();
        setupDb.Users.Add(new User
        {
            TenantId = 1, Email = "t@t.fr", PasswordHash = "h",
            FirstName = "A", LastName = "B", Role = UserRole.Admin,
            IsActive = true, CreatedAt = DateTime.UtcNow
        });
        setupDb.SaveChanges();

        // Create middleware: _next saves an entity then throws (simulates audit failure after business mutation)
        var middleware = new TransactionMiddleware(async _ =>
        {
            // Use a fresh DbContext to avoid tracking issues after rollback
            using var db = new AppDbContext(options, tenantContext);
            db.AuditEvents.Add(new AuditEvent
            {
                EntityType = "Test", EntityId = 99, TenantId = 1, UserId = 1,
                Action = AuditAction.Created, CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            throw new InvalidOperationException("Simulated audit failure");
        });

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "POST";

        // Use a fresh DbContext for the middleware's transaction
        using var middlewareDb = new AppDbContext(options, tenantContext);

        // The middleware should catch, rollback, and rethrow
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => middleware.InvokeAsync(httpContext, middlewareDb));

        // Verify rollback: the audit event should NOT be persisted
        using var verifyDb = new AppDbContext(options, tenantContext);
        var events = await verifyDb.AuditEvents.IgnoreQueryFilters().ToListAsync();
        Assert.Empty(events);
    }

    /// <summary>
    /// 18.3 — GET requests do not create a transaction (pass through)
    /// </summary>
    [Fact]
    public async Task GetRequest_NoTransaction_ReturnsSuccessfully()
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        var token = _factory.GenerateTestToken(userId, tenantId, UserRole.Admin);
        var client = _factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
