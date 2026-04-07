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

public class SiteServiceGetAllTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly SiteService _service;
    private readonly TestTenantContext _tenantContext;
    private readonly int _tenantId;
    private readonly int _userId;
    private readonly int _customerId;

    public SiteServiceGetAllTests()
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

    private void SeedSites(int count, SiteStatus status = SiteStatus.Planned)
    {
        for (int i = 1; i <= count; i++)
        {
            _refCounter++;
            _db.Sites.Add(new Site
            {
                TenantId = _tenantId,
                CustomerId = _customerId,
                CreatedBy = _userId,
                Reference = $"CH-2026-{_refCounter:000}",
                Subject = $"Chantier {_refCounter}",
                SiteAddress = $"{_refCounter} rue Test",
                Status = status,
                CreatedAt = DateTime.UtcNow.AddMinutes(-count + i)
            });
        }
        _db.SaveChanges();
    }

    [Fact]
    public async Task GetAllAsync_Pagination_ShouldReturnCorrectPage()
    {
        SeedSites(25);

        var result = await _service.GetAllAsync(page: 2, pageSize: 10);

        Assert.Equal(10, result.Data.Count);
        Assert.Equal(2, result.Pagination.Page);
        Assert.Equal(10, result.Pagination.PageSize);
        Assert.Equal(25, result.Pagination.TotalItems);
        Assert.Equal(3, result.Pagination.TotalPages);
    }

    [Fact]
    public async Task GetAllAsync_FilterByStatus_ShouldReturnMatchingOnly()
    {
        SeedSites(3, SiteStatus.Planned);
        SeedSites(2, SiteStatus.InProgress);

        var result = await _service.GetAllAsync(status: "InProgress");

        Assert.Equal(2, result.Data.Count);
        Assert.All(result.Data, s => Assert.Equal("InProgress", s.Status));
    }

    [Fact]
    public async Task GetAllAsync_Search_ShouldMatchCustomerName()
    {
        SeedSites(3);

        // Customer is "Dupont Jean"
        var result = await _service.GetAllAsync(search: "Dupont");

        Assert.Equal(3, result.Data.Count);
    }

    [Fact]
    public async Task GetAllAsync_Search_ShouldMatchReference()
    {
        SeedSites(3);

        var result = await _service.GetAllAsync(search: "CH-2026-002");

        Assert.Single(result.Data);
        Assert.Equal("CH-2026-002", result.Data[0].Reference);
    }

    [Fact]
    public async Task GetAllAsync_Search_ShouldMatchAddress()
    {
        SeedSites(5);

        var result = await _service.GetAllAsync(search: "3 rue Test");

        Assert.Single(result.Data);
    }

    [Fact]
    public async Task GetAllAsync_Sorting_ByReference_Asc()
    {
        SeedSites(3);

        var result = await _service.GetAllAsync(sortBy: "Reference", sortDirection: "asc");

        Assert.Equal("CH-2026-001", result.Data[0].Reference);
        Assert.Equal("CH-2026-003", result.Data[^1].Reference);
    }

    [Fact]
    public async Task GetAllAsync_Sorting_ByCreatedAt_Desc_Default()
    {
        SeedSites(3);

        var result = await _service.GetAllAsync();

        // Default sort: CreatedAt desc — most recent first
        Assert.Equal("CH-2026-003", result.Data[0].Reference);
        Assert.Equal("CH-2026-001", result.Data[^1].Reference);
    }

    [Fact]
    public async Task GetAllAsync_EmptyResult_ShouldReturnEmptyData()
    {
        var result = await _service.GetAllAsync();

        Assert.Empty(result.Data);
        Assert.Equal(0, result.Pagination.TotalItems);
        Assert.Equal(0, result.Pagination.TotalPages);
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
