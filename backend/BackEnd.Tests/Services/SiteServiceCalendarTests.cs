using System.Diagnostics;
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
using Moq;

namespace BackEnd.Tests.Services;

public class SiteServiceCalendarTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly SiteService _service;
    private readonly TestTenantContext _tenantContext;
    private readonly int _tenantId;
    private readonly int _otherTenantId;
    private readonly int _userId;
    private readonly int _customerId;

    public SiteServiceCalendarTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _tenantContext = new TestTenantContext();
        _db = new AppDbContext(options, _tenantContext);
        _db.Database.EnsureCreated();

        var tenant = new Tenant { Name = "Test Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(tenant);
        _db.SaveChanges();
        _tenantId = tenant.Id;
        _tenantContext.TenantId = _tenantId;

        var otherTenant = new Tenant { Name = "Other Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        _db.SaveChanges();
        _otherTenantId = otherTenant.Id;

        var user = new User
        {
            TenantId = _tenantId,
            Email = "chef@test.fr",
            PasswordHash = "hash",
            FirstName = "Chef",
            LastName = "Test",
            Role = UserRole.Chef,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        _db.SaveChanges();
        _userId = user.Id;

        var customer = new Customer
        {
            TenantId = _tenantId,
            LastName = "Dupont",
            FirstName = "Jean",
            CreatedAt = DateTime.UtcNow
        };
        _db.Customers.Add(customer);
        _db.SaveChanges();
        _customerId = customer.Id;

        var auditServiceMock = new Mock<IAuditService>();
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _userId.ToString())
        }));
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        _service = new SiteService(_db, _tenantContext, auditServiceMock.Object,
            httpContextAccessorMock.Object, NullLogger<SiteService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private int _refCounter;

    private Site CreateSite(DateOnly? startDate, DateOnly? endDate, SiteStatus status = SiteStatus.Planned, int? tenantId = null)
    {
        _refCounter++;
        var site = new Site
        {
            TenantId = tenantId ?? _tenantId,
            CustomerId = _customerId,
            CreatedBy = _userId,
            Reference = $"CH-2026-{_refCounter:000}",
            Subject = $"Chantier {_refCounter}",
            SiteAddress = $"{_refCounter} rue Test",
            Status = status,
            StartDate = startDate,
            EndDate = endDate,
            CreatedAt = DateTime.UtcNow
        };
        _db.Sites.Add(site);
        return site;
    }

    // --- Task 1.4: Filtrage par plage de dates ---

    [Fact]
    public async Task GetCalendarSites_ShouldReturnSitesInDateRange()
    {
        CreateSite(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 5));
        CreateSite(new DateOnly(2026, 4, 10), new DateOnly(2026, 4, 15));
        CreateSite(new DateOnly(2026, 5, 1), new DateOnly(2026, 5, 5)); // outside range
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetCalendarSites_ShouldIncludePartialOverlap()
    {
        // Site starts before range, ends within
        CreateSite(new DateOnly(2026, 3, 28), new DateOnly(2026, 4, 3));
        // Site starts within range, ends after
        CreateSite(new DateOnly(2026, 4, 28), new DateOnly(2026, 5, 5));
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetCalendarSites_ShouldIncludeSpanningRange()
    {
        // Site spans entire query range
        CreateSite(new DateOnly(2026, 3, 1), new DateOnly(2026, 5, 31));
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Single(result);
    }

    // --- Task 1.4: Tenant isolation ---

    [Fact]
    public async Task GetCalendarSites_ShouldRespectTenantIsolation()
    {
        // Site for current tenant
        CreateSite(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 5));
        _db.SaveChanges();

        // Create user and customer for other tenant (temporarily switch context)
        _tenantContext.TenantId = _otherTenantId;
        var otherUser = new User
        {
            TenantId = _otherTenantId,
            Email = "other@test.fr",
            PasswordHash = "hash",
            FirstName = "Other",
            LastName = "User",
            Role = UserRole.Chef,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(otherUser);
        var otherCustomer = new Customer
        {
            TenantId = _otherTenantId,
            LastName = "Martin",
            FirstName = "Paul",
            CreatedAt = DateTime.UtcNow
        };
        _db.Customers.Add(otherCustomer);
        _db.SaveChanges();

        // Create site for other tenant
        _db.Sites.Add(new Site
        {
            TenantId = _otherTenantId,
            CustomerId = otherCustomer.Id,
            CreatedBy = otherUser.Id,
            Reference = "CH-OTHER-001",
            Subject = "Other Tenant Site",
            SiteAddress = "1 rue Other",
            Status = SiteStatus.Planned,
            StartDate = new DateOnly(2026, 4, 2),
            EndDate = new DateOnly(2026, 4, 6),
            CreatedAt = DateTime.UtcNow
        });
        _db.SaveChanges();

        // Switch back to original tenant
        _tenantContext.TenantId = _tenantId;

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Single(result); // Only current tenant's site
    }

    // --- Task 1.4: Assignations incluses ---

    [Fact]
    public async Task GetCalendarSites_ShouldIncludeAssignments()
    {
        var site = CreateSite(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 5));
        _db.SaveChanges();

        var worker = new User
        {
            TenantId = _tenantId,
            Email = "worker@test.fr",
            PasswordHash = "hash",
            FirstName = "Pierre",
            LastName = "Martin",
            Role = UserRole.Ouvrier,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(worker);
        _db.SaveChanges();

        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId,
            SiteId = site.Id,
            UserId = worker.Id,
            CreatedAt = DateTime.UtcNow
        });
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Single(result);
        Assert.Single(result[0].Assignments);
        Assert.Equal("Martin Pierre", result[0].Assignments[0].UserFullName);
    }

    // --- Task 1.4: Exclusion chantiers sans dates ---

    [Fact]
    public async Task GetCalendarSites_ShouldExcludeSitesWithoutDates()
    {
        CreateSite(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 5)); // with dates
        CreateSite(null, null); // no dates
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Single(result);
    }

    // --- Task 1.5: Edge cases ---

    [Fact]
    public async Task GetCalendarSites_ShouldExcludeSiteWithNullStartDate()
    {
        CreateSite(null, new DateOnly(2026, 4, 5));
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCalendarSites_ShouldExcludeSiteWithNullEndDate()
    {
        CreateSite(new DateOnly(2026, 4, 1), null);
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCalendarSites_EmptyRange_ShouldReturnEmpty()
    {
        CreateSite(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 5));
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 30));

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCalendarSites_ShouldReturnCorrectDtoFields()
    {
        var site = CreateSite(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 5), SiteStatus.InProgress);
        _db.SaveChanges();

        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        var dto = result[0];
        Assert.Equal(site.Id, dto.Id);
        Assert.Equal(site.Reference, dto.Reference);
        Assert.Equal(site.Subject, dto.Subject);
        Assert.Equal("InProgress", dto.Status);
        Assert.Equal(site.SiteAddress, dto.SiteAddress);
        Assert.Equal("2026-04-01", dto.StartDate);
        Assert.Equal("2026-04-05", dto.EndDate);
        Assert.Equal("Dupont Jean", dto.CustomerName);
    }

    // --- Task 1.6: Stress test ---

    [Fact]
    public async Task GetCalendarSites_Stress_50SitesWithAssignments_ShouldRespondFast()
    {
        var workers = new List<User>();
        for (int w = 0; w < 10; w++)
        {
            var worker = new User
            {
                TenantId = _tenantId,
                Email = $"worker{w}@test.fr",
                PasswordHash = "hash",
                FirstName = $"Worker{w}",
                LastName = $"Last{w}",
                Role = UserRole.Ouvrier,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _db.Users.Add(worker);
            workers.Add(worker);
        }
        _db.SaveChanges();

        for (int i = 0; i < 50; i++)
        {
            var site = CreateSite(
                new DateOnly(2026, 4, 1).AddDays(i % 28),
                new DateOnly(2026, 4, 1).AddDays(i % 28 + 3));
            _db.SaveChanges();

            for (int a = 0; a < 10; a++)
            {
                _db.SiteAssignments.Add(new SiteAssignment
                {
                    TenantId = _tenantId,
                    SiteId = site.Id,
                    UserId = workers[a].Id,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        _db.SaveChanges();

        var sw = Stopwatch.StartNew();
        var result = await _service.GetCalendarSitesAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));
        sw.Stop();

        Assert.True(result.Count > 0);
        Assert.True(sw.ElapsedMilliseconds < 200, $"Calendar endpoint took {sw.ElapsedMilliseconds}ms, expected < 200ms");
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
