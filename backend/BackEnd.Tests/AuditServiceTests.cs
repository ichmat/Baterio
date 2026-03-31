using System.Security.Claims;
using BackEnd.API.Data;
using BackEnd.API.Services;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace BackEnd.Tests;

public class AuditServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly AuditService _auditService;
    private readonly int _tenantId;
    private readonly int _userId;

    public AuditServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var tenantContext = new TestTenantContext();
        _db = new AppDbContext(options, tenantContext);
        _db.Database.EnsureCreated();

        // Seed tenant and user
        var tenant = new Tenant { Name = "Test Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(tenant);
        _db.SaveChanges();
        _tenantId = tenant.Id;
        tenantContext.TenantId = _tenantId;

        var user = new User
        {
            TenantId = _tenantId,
            Email = "test@baterio.fr",
            PasswordHash = "hash",
            FirstName = "Test",
            LastName = "User",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        _db.SaveChanges();
        _userId = user.Id;

        var httpContextAccessor = CreateHttpContextAccessor(_userId);

        _auditService = new AuditService(_db, tenantContext, httpContextAccessor, NullLogger<AuditService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task LogEventAsync_CreatesEventWithCorrectValues()
    {
        await _auditService.LogEventAsync("User", 42, AuditAction.Created,
            new { Email = "new@test.fr", FirstName = "New" });

        var evt = await _db.AuditEvents.FirstOrDefaultAsync();
        Assert.NotNull(evt);
        Assert.Equal("User", evt.EntityType);
        Assert.Equal(42, evt.EntityId);
        Assert.Equal(AuditAction.Created, evt.Action);
        Assert.Equal(_tenantId, evt.TenantId);
        Assert.Equal(_userId, evt.UserId);
        Assert.Contains("new@test.fr", evt.Payload!);
    }

    [Fact]
    public async Task LogEventAsync_NullPayload_WorksCorrectly()
    {
        await _auditService.LogEventAsync("User", 1, AuditAction.Deleted);

        var evt = await _db.AuditEvents.FirstOrDefaultAsync();
        Assert.NotNull(evt);
        Assert.Null(evt.Payload);
        Assert.Equal(AuditAction.Deleted, evt.Action);
    }

    [Fact]
    public async Task GetEventsAsync_ReturnsSortedByDateDescending()
    {
        // Seed events with different timestamps
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Created, CreatedAt = DateTime.UtcNow.AddHours(-2)
        });
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Updated, CreatedAt = DateTime.UtcNow.AddHours(-1)
        });
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Deleted, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _auditService.GetEventsAsync("User", 1);

        Assert.Equal(3, result.Data.Count);
        Assert.Equal("Deleted", result.Data[0].Action);
        Assert.Equal("Updated", result.Data[1].Action);
        Assert.Equal("Created", result.Data[2].Action);
    }

    [Fact]
    public async Task GetEventsAsync_RespectsPagination()
    {
        // Seed 5 events
        for (var i = 0; i < 5; i++)
        {
            _db.AuditEvents.Add(new AuditEvent
            {
                EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
                Action = AuditAction.Updated, CreatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        }
        await _db.SaveChangesAsync();

        var page1 = await _auditService.GetEventsAsync("User", 1, page: 1, pageSize: 2);
        var page2 = await _auditService.GetEventsAsync("User", 1, page: 2, pageSize: 2);

        Assert.Equal(2, page1.Data.Count);
        Assert.Equal(2, page2.Data.Count);
        Assert.Equal(5, page1.Pagination.TotalItems);
        Assert.Equal(3, page1.Pagination.TotalPages);
        Assert.Equal(1, page1.Pagination.Page);
        Assert.Equal(2, page1.Pagination.PageSize);
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(-1, 20)]
    [InlineData(1, 0)]
    [InlineData(1, -5)]
    [InlineData(1, 200)]
    public async Task GetEventsAsync_InvalidPageParams_ClampedToValidRange(int page, int pageSize)
    {
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Created, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _auditService.GetEventsAsync("User", 1, page, pageSize);

        // Should not throw — values are clamped
        Assert.NotNull(result);
        Assert.True(result.Pagination.Page >= 1);
        Assert.True(result.Pagination.PageSize >= 1);
        Assert.True(result.Pagination.PageSize <= 100);
    }

    [Fact]
    public async Task GetEventsAsync_TenantIsolation_DoesNotReturnOtherTenantEvents()
    {
        // Seed event for current tenant
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Created, CreatedAt = DateTime.UtcNow
        });

        // Seed another tenant with an event
        var otherTenant = new Tenant { Name = "Other", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        await _db.SaveChangesAsync();

        var otherUser = new User
        {
            TenantId = otherTenant.Id, Email = "other@test.fr", PasswordHash = "hash",
            FirstName = "Other", LastName = "User", Role = UserRole.Admin, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(otherUser);
        await _db.SaveChangesAsync();

        // Insert directly to bypass query filter for the other tenant's event
        _db.Database.ExecuteSqlRaw(
            "INSERT INTO audit_events (entity_type, entity_id, tenant_id, user_id, action, created_at) VALUES ('User', 1, {0}, {1}, 'Created', datetime('now'))",
            otherTenant.Id, otherUser.Id);

        var result = await _auditService.GetEventsAsync("User", 1);

        // Should only get the event from current tenant (Global Query Filter)
        Assert.Single(result.Data);
        Assert.Equal(_userId, result.Data[0].UserId);
    }

    [Fact]
    public async Task GetEventsAsync_WithActionFilter_ReturnsOnlyMatchingEvents()
    {
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.StatusChanged, CreatedAt = DateTime.UtcNow.AddMinutes(-2)
        });
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Updated, CreatedAt = DateTime.UtcNow.AddMinutes(-1)
        });
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.StatusChanged, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _auditService.GetEventsAsync("User", 1, action: "StatusChanged");

        Assert.Equal(2, result.Data.Count);
        Assert.All(result.Data, e => Assert.Equal("StatusChanged", e.Action));
    }

    [Fact]
    public async Task GetEventsAsync_WithoutActionFilter_ReturnsAllEvents()
    {
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Created, CreatedAt = DateTime.UtcNow.AddMinutes(-2)
        });
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.StatusChanged, CreatedAt = DateTime.UtcNow.AddMinutes(-1)
        });
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.CommentAdded, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _auditService.GetEventsAsync("User", 1);

        Assert.Equal(3, result.Data.Count);
    }

    [Fact]
    public async Task GetEventsAsync_WithInvalidAction_ReturnsEmptyList()
    {
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Created, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _auditService.GetEventsAsync("User", 1, action: "InvalidAction");

        Assert.Empty(result.Data);
        Assert.Equal(0, result.Pagination.TotalItems);
    }

    [Fact]
    public async Task GetEventsAsync_WithActionFilterAndPagination_WorksTogether()
    {
        for (var i = 0; i < 5; i++)
        {
            _db.AuditEvents.Add(new AuditEvent
            {
                EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
                Action = AuditAction.CommentAdded, CreatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        }
        _db.AuditEvents.Add(new AuditEvent
        {
            EntityType = "User", EntityId = 1, TenantId = _tenantId, UserId = _userId,
            Action = AuditAction.Created, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var page1 = await _auditService.GetEventsAsync("User", 1, page: 1, pageSize: 2, action: "CommentAdded");

        Assert.Equal(2, page1.Data.Count);
        Assert.Equal(5, page1.Pagination.TotalItems);
        Assert.All(page1.Data, e => Assert.Equal("CommentAdded", e.Action));
    }

    private static IHttpContextAccessor CreateHttpContextAccessor(int userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        var accessor = new HttpContextAccessor { HttpContext = httpContext };
        return accessor;
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
