using System.Security.Claims;
using BackEnd.API.Data;
using BackEnd.API.Services;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.CustomFields;
using BackEnd.Shared.Models.Sites;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace BackEnd.Tests.Services;

public class SiteServiceUpdateTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly SiteService _service;
    private readonly Mock<IAuditService> _auditServiceMock;
    private readonly TestTenantContext _tenantContext;
    private readonly int _tenantId;
    private readonly int _userId;
    private readonly int _customerId;

    public SiteServiceUpdateTests()
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

        _auditServiceMock = new Mock<IAuditService>();

        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _userId.ToString())
        }));
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        _service = new SiteService(_db, _tenantContext, _auditServiceMock.Object,
            httpContextAccessorMock.Object, NullLogger<SiteService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private async Task<int> SeedSiteAsync(SiteStatus status = SiteStatus.Planned)
    {
        var site = new Site
        {
            TenantId = _tenantId,
            CustomerId = _customerId,
            CreatedBy = _userId,
            Reference = "CH-2026-001",
            Subject = "Rénovation cuisine",
            SiteAddress = "12 rue de la Paix, 75002 Paris",
            Status = status,
            CreatedAt = DateTime.UtcNow
        };
        _db.Sites.Add(site);
        await _db.SaveChangesAsync();
        return site.Id;
    }

    // --- UpdateStatusAsync: Valid Transitions ---

    [Theory]
    [InlineData(SiteStatus.Planned, "InProgress")]
    [InlineData(SiteStatus.InProgress, "Paused")]
    [InlineData(SiteStatus.InProgress, "Completed")]
    [InlineData(SiteStatus.Paused, "InProgress")]
    [InlineData(SiteStatus.Paused, "Completed")]
    public async Task UpdateStatusAsync_ValidTransitions_ShouldSucceed(SiteStatus initial, string target)
    {
        var siteId = await SeedSiteAsync(initial);

        var result = await _service.UpdateStatusAsync(siteId, target);

        Assert.Equal(target, result.Status);
        _auditServiceMock.Verify(a => a.LogEventAsync("Site", siteId, AuditAction.StatusChanged,
            It.Is<object>(o => o.ToString()!.Contains(initial.ToString()) && o.ToString()!.Contains(target))),
            Times.Once);
    }

    // --- UpdateStatusAsync: Invalid Transitions ---

    [Theory]
    [InlineData(SiteStatus.Completed, "InProgress")]
    [InlineData(SiteStatus.Planned, "Completed")]
    [InlineData(SiteStatus.Planned, "Paused")]
    [InlineData(SiteStatus.Completed, "Paused")]
    public async Task UpdateStatusAsync_InvalidTransitions_ShouldThrow(SiteStatus initial, string target)
    {
        var siteId = await SeedSiteAsync(initial);

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(siteId, target));

        Assert.Equal(ApiError.SiteInvalidStatusTransition, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_SiteNotFound_ShouldThrow()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(999, "InProgress"));

        Assert.Equal(ApiError.SiteNotFound, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_InvalidStatusString_ShouldThrow()
    {
        var siteId = await SeedSiteAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(siteId, "InvalidStatus"));

        Assert.Equal(ApiError.SiteInvalidStatusTransition, ex.Code);
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task UpdateAsync_AllFields_ShouldSaveAndAuditDiff()
    {
        var siteId = await SeedSiteAsync();

        var request = new UpdateSiteRequest
        {
            Subject = "Rénovation salle de bain",
            SiteAddress = "5 avenue des Champs, 75008 Paris",
            StartDate = "2026-05-01",
            EndDate = "2026-06-30",
            Notes = "Notes mises à jour"
        };

        var result = await _service.UpdateAsync(siteId, request);

        Assert.Equal("Rénovation salle de bain", result.Subject);
        Assert.Equal("5 avenue des Champs, 75008 Paris", result.SiteAddress);
        Assert.Equal("2026-05-01", result.StartDate);
        Assert.Equal("2026-06-30", result.EndDate);
        Assert.Equal("Notes mises à jour", result.Notes);

        _auditServiceMock.Verify(a => a.LogEventAsync("Site", siteId, AuditAction.Updated,
            It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_PartialDiff_ShouldAuditOnlyChangedFields()
    {
        var siteId = await SeedSiteAsync();

        var request = new UpdateSiteRequest
        {
            Subject = "Nouveau sujet",
            SiteAddress = "12 rue de la Paix, 75002 Paris" // same as seeded
        };

        var result = await _service.UpdateAsync(siteId, request);

        Assert.Equal("Nouveau sujet", result.Subject);

        _auditServiceMock.Verify(a => a.LogEventAsync("Site", siteId, AuditAction.Updated,
            It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_NoChanges_ShouldNotAudit()
    {
        var siteId = await SeedSiteAsync();

        var request = new UpdateSiteRequest
        {
            Subject = "Rénovation cuisine",
            SiteAddress = "12 rue de la Paix, 75002 Paris"
        };

        await _service.UpdateAsync(siteId, request);

        _auditServiceMock.Verify(a => a.LogEventAsync("Site", siteId, AuditAction.Updated,
            It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_CustomFieldsDiff_ShouldUseNamespace()
    {
        // Seed a custom field definition
        var cfDef = new CustomFieldDefinition
        {
            TenantId = _tenantId,
            Label = "Type de travaux",
            FieldType = FieldType.Text,
            AppliesToSites = true,
            ObligationLevel = ObligationLevel.Never,
            CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfDef);
        await _db.SaveChangesAsync();

        var siteId = await SeedSiteAsync();

        var request = new UpdateSiteRequest
        {
            Subject = "Rénovation cuisine",
            SiteAddress = "12 rue de la Paix, 75002 Paris",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfDef.Id, Label = "Type de travaux", Value = "Rénovation" }
            }
        };

        await _service.UpdateAsync(siteId, request);

        _auditServiceMock.Verify(a => a.LogEventAsync("Site", siteId, AuditAction.Updated,
            It.IsAny<object>()), Times.Once);
    }

    // --- UpdateAsync: Validation ---

    [Fact]
    public async Task UpdateAsync_EmptySubject_ShouldThrow()
    {
        var siteId = await SeedSiteAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(siteId, new UpdateSiteRequest
            {
                Subject = "",
                SiteAddress = "12 rue Test"
            }));

        Assert.Equal(ApiError.SiteSubjectRequired, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_SubjectTooLong_ShouldThrow()
    {
        var siteId = await SeedSiteAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(siteId, new UpdateSiteRequest
            {
                Subject = new string('A', 501),
                SiteAddress = "12 rue Test"
            }));

        Assert.Equal(ApiError.SiteSubjectTooLong, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_EmptyAddress_ShouldThrow()
    {
        var siteId = await SeedSiteAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(siteId, new UpdateSiteRequest
            {
                Subject = "OK",
                SiteAddress = ""
            }));

        Assert.Equal(ApiError.SiteAddressRequired, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_AddressTooLong_ShouldThrow()
    {
        var siteId = await SeedSiteAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(siteId, new UpdateSiteRequest
            {
                Subject = "OK",
                SiteAddress = new string('A', 1001)
            }));

        Assert.Equal(ApiError.SiteAddressTooLong, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_NotesTooLong_ShouldThrow()
    {
        var siteId = await SeedSiteAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(siteId, new UpdateSiteRequest
            {
                Subject = "OK",
                SiteAddress = "12 rue Test",
                Notes = new string('A', 5001)
            }));

        Assert.Equal(ApiError.SiteNotesTooLong, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_SiteNotFound_ShouldThrow()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(999, new UpdateSiteRequest
            {
                Subject = "OK",
                SiteAddress = "12 rue Test"
            }));

        Assert.Equal(ApiError.SiteNotFound, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_EndDateBeforeStartDate_ShouldThrow()
    {
        var siteId = await SeedSiteAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(siteId, new UpdateSiteRequest
            {
                Subject = "OK",
                SiteAddress = "12 rue Test",
                StartDate = "2026-06-01",
                EndDate = "2026-05-01"
            }));

        Assert.Equal(ApiError.SiteEndDateBeforeStartDate, ex.Code);
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
