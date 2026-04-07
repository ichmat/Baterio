using BackEnd.API.Data;
using BackEnd.API.Services;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.SiteAssignments;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Security.Claims;

namespace BackEnd.Tests;

public class SiteAssignmentServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly SiteAssignmentService _service;
    private readonly Mock<IAuditService> _auditServiceMock;
    private readonly TestTenantContext _tenantContext;
    private readonly int _tenantId;
    private readonly int _userId;
    private readonly int _ouvrierId;
    private readonly int _ouvrier2Id;
    private readonly int _customerId;
    private readonly int _siteId;
    private readonly int _site2Id;

    public SiteAssignmentServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _tenantContext = new TestTenantContext();
        _db = new AppDbContext(options, _tenantContext);
        _db.Database.EnsureCreated();

        // Seed tenant
        var tenant = new Tenant { Name = "Test Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(tenant);
        _db.SaveChanges();
        _tenantId = tenant.Id;
        _tenantContext.TenantId = _tenantId;

        // Seed chef user
        var user = new User
        {
            TenantId = _tenantId, Email = "chef@test.fr", PasswordHash = "hash",
            FirstName = "Chef", LastName = "Test", Role = UserRole.Chef, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        _db.SaveChanges();
        _userId = user.Id;

        // Seed ouvrier
        var ouvrier = new User
        {
            TenantId = _tenantId, Email = "ouvrier@test.fr", PasswordHash = "hash",
            FirstName = "Pierre", LastName = "Martin", Role = UserRole.Ouvrier, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(ouvrier);
        _db.SaveChanges();
        _ouvrierId = ouvrier.Id;

        // Seed ouvrier 2
        var ouvrier2 = new User
        {
            TenantId = _tenantId, Email = "ouvrier2@test.fr", PasswordHash = "hash",
            FirstName = "Jean", LastName = "Dupont", Role = UserRole.Ouvrier, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(ouvrier2);
        _db.SaveChanges();
        _ouvrier2Id = ouvrier2.Id;

        // Seed customer
        var customer = new Customer
        {
            TenantId = _tenantId, LastName = "Client", FirstName = "Test", CreatedAt = DateTime.UtcNow
        };
        _db.Customers.Add(customer);
        _db.SaveChanges();
        _customerId = customer.Id;

        // Seed sites
        var site = new Site
        {
            TenantId = _tenantId, CustomerId = _customerId, CreatedBy = _userId,
            Reference = "CH-2026-001", Subject = "Chantier A", SiteAddress = "10 rue Test",
            StartDate = new DateOnly(2026, 4, 1), EndDate = new DateOnly(2026, 4, 30), CreatedAt = DateTime.UtcNow
        };
        _db.Sites.Add(site);
        _db.SaveChanges();
        _siteId = site.Id;

        var site2 = new Site
        {
            TenantId = _tenantId, CustomerId = _customerId, CreatedBy = _userId,
            Reference = "CH-2026-002", Subject = "Chantier B", SiteAddress = "20 rue Test",
            StartDate = new DateOnly(2026, 4, 1), EndDate = new DateOnly(2026, 4, 30), CreatedAt = DateTime.UtcNow
        };
        _db.Sites.Add(site2);
        _db.SaveChanges();
        _site2Id = site2.Id;

        _auditServiceMock = new Mock<IAuditService>();

        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, _userId.ToString())
            }))
        };
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        _service = new SiteAssignmentService(_db, _tenantContext, _auditServiceMock.Object, httpContextAccessorMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    // --- Creation Tests ---

    [Fact]
    public async Task CreateAsync_FullDuration_CreatesNullNullAssignment()
    {
        var result = await _service.CreateAsync(_siteId, new CreateAssignmentRequest
        {
            UserId = _ouvrierId, Mode = "full_duration"
        });

        Assert.Single(result);
        Assert.Null(result[0].StartDatetime);
        Assert.Null(result[0].EndDatetime);
        Assert.Equal("Martin Pierre", result[0].UserFullName);
        _auditServiceMock.Verify(a => a.LogEventAsync("SiteAssignment", It.IsAny<int>(), AuditAction.Created, It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_DatePreset_CreatesSingleAssignment()
    {
        var result = await _service.CreateAsync(_siteId, new CreateAssignmentRequest
        {
            UserId = _ouvrierId, Mode = "date_preset",
            Date = "2026-04-10", PresetStartTime = "08:00", PresetEndTime = "12:00"
        });

        Assert.Single(result);
        Assert.Equal(new DateTime(2026, 4, 10, 8, 0, 0), result[0].StartDatetime);
        Assert.Equal(new DateTime(2026, 4, 10, 12, 0, 0), result[0].EndDatetime);
    }

    [Fact]
    public async Task CreateAsync_RangePreset_CreatesMultipleAssignments()
    {
        var result = await _service.CreateAsync(_siteId, new CreateAssignmentRequest
        {
            UserId = _ouvrierId, Mode = "range_preset",
            StartDate = "2026-04-10", EndDate = "2026-04-12",
            PresetStartTime = "08:00", PresetEndTime = "17:00"
        });

        Assert.Equal(3, result.Count); // 10, 11, 12 April
        Assert.Equal(new DateTime(2026, 4, 10, 8, 0, 0), result[0].StartDatetime);
        Assert.Equal(new DateTime(2026, 4, 12, 17, 0, 0), result[2].EndDatetime);
    }

    [Fact]
    public async Task CreateAsync_FreeMode_CreatesOneAssignment()
    {
        var start = new DateTime(2026, 4, 15, 9, 30, 0);
        var end = new DateTime(2026, 4, 15, 16, 0, 0);

        var result = await _service.CreateAsync(_siteId, new CreateAssignmentRequest
        {
            UserId = _ouvrierId, Mode = "free",
            StartDatetime = start, EndDatetime = end
        });

        Assert.Single(result);
        Assert.Equal(start, result[0].StartDatetime);
        Assert.Equal(end, result[0].EndDatetime);
    }

    // --- Validation Tests ---

    [Fact]
    public async Task CreateAsync_SiteNotFound_ThrowsAssignmentSiteNotFound()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(9999, new CreateAssignmentRequest { UserId = _ouvrierId, Mode = "full_duration" }));
        Assert.Equal(ApiError.AssignmentSiteNotFound, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_UserNotFound_ThrowsAssignmentWorkerNotFound()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest { UserId = 9999, Mode = "full_duration" }));
        Assert.Equal(ApiError.AssignmentWorkerNotFound, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_NonOuvrierRole_ThrowsAssignmentWorkerRoleRequired()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest { UserId = _userId, Mode = "full_duration" })); // Chef user
        Assert.Equal(ApiError.AssignmentWorkerRoleRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_FreeMode_InvalidDates_ThrowsAssignmentInvalidDateRange()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest
            {
                UserId = _ouvrierId, Mode = "free",
                StartDatetime = new DateTime(2026, 4, 15, 16, 0, 0),
                EndDatetime = new DateTime(2026, 4, 15, 9, 0, 0) // End before start
            }));
        Assert.Equal(ApiError.AssignmentInvalidDateRange, ex.Code);
    }

    // --- Conflict Detection Tests ---

    [Fact]
    public async Task CheckConflicts_OverlappingPrecise_ReturnsConflict()
    {
        // Create existing assignment on site 2
        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _site2Id, UserId = _ouvrierId,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 12, 0, 0),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var warnings = await _service.CheckConflictsAsync(
            _siteId, _ouvrierId,
            new DateTime(2026, 4, 10, 10, 0, 0),
            new DateTime(2026, 4, 10, 14, 0, 0));

        Assert.Single(warnings);
        Assert.Equal("conflict", warnings[0].Type);
        Assert.Contains("conflit", warnings[0].Message);
    }

    [Fact]
    public async Task CheckConflicts_FullDurationExisting_ReturnsInfoWarning()
    {
        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _site2Id, UserId = _ouvrierId,
            StartDatetime = null, EndDatetime = null, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var warnings = await _service.CheckConflictsAsync(
            _siteId, _ouvrierId,
            new DateTime(2026, 4, 10, 8, 0, 0),
            new DateTime(2026, 4, 10, 12, 0, 0));

        Assert.Single(warnings);
        Assert.Equal("info", warnings[0].Type);
        Assert.Contains("toute sa durée", warnings[0].Message);
    }

    [Fact]
    public async Task CheckConflicts_NoOverlap_ReturnsEmpty()
    {
        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _site2Id, UserId = _ouvrierId,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 12, 0, 0),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var warnings = await _service.CheckConflictsAsync(
            _siteId, _ouvrierId,
            new DateTime(2026, 4, 10, 13, 0, 0),
            new DateTime(2026, 4, 10, 17, 0, 0));

        Assert.Empty(warnings);
    }

    // --- Update / Delete Tests ---

    [Fact]
    public async Task UpdateAsync_ChangesDates_AndLogsAudit()
    {
        var assignment = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 12, 0, 0),
            CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        var result = await _service.UpdateAsync(_siteId, assignment.Id, new UpdateAssignmentRequest
        {
            StartDatetime = new DateTime(2026, 4, 10, 9, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 13, 0, 0)
        });

        Assert.Equal(new DateTime(2026, 4, 10, 9, 0, 0), result.StartDatetime);
        Assert.Equal(new DateTime(2026, 4, 10, 13, 0, 0), result.EndDatetime);
        _auditServiceMock.Verify(a => a.LogEventAsync("SiteAssignment", assignment.Id, AuditAction.Updated, It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_RemovesAssignment_AndLogsAudit()
    {
        var assignment = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = null, EndDatetime = null, CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        await _service.DeleteAsync(_siteId, assignment.Id);

        Assert.Empty(await _db.SiteAssignments.ToListAsync());
        _auditServiceMock.Verify(a => a.LogEventAsync("SiteAssignment", assignment.Id, AuditAction.Deleted, It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_NotFound_ThrowsAssignmentNotFound()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.DeleteAsync(_siteId, 9999));
        Assert.Equal(ApiError.AssignmentNotFound, ex.Code);
    }

    // --- Adjustment Tests ---

    [Fact]
    public async Task ApplyAdjustmentsAsync_AdjustsAssignments()
    {
        var assignment = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 16, 0, 0),
            CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        var result = await _service.ApplyAdjustmentsAsync(_siteId, new List<AssignmentAdjustment>
        {
            new() { AssignmentId = assignment.Id, NewStartDatetime = new DateTime(2026, 4, 10, 8, 0, 0), NewEndDatetime = new DateTime(2026, 4, 10, 12, 0, 0) }
        });

        Assert.Single(result);
        Assert.Equal(new DateTime(2026, 4, 10, 12, 0, 0), result[0].EndDatetime);
    }

    // --- Tenant Isolation Test ---

    [Fact]
    public async Task GetBySiteAsync_DoesNotReturnOtherTenantAssignments()
    {
        // Create assignment on different tenant
        var otherTenant = new Tenant { Name = "Other", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        await _db.SaveChangesAsync();

        var otherUser = new User
        {
            TenantId = otherTenant.Id, Email = "other@test.fr", PasswordHash = "hash",
            FirstName = "Other", LastName = "User", Role = UserRole.Ouvrier, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(otherUser);

        var otherCustomer = new Customer { TenantId = otherTenant.Id, LastName = "Other", FirstName = "Client", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(otherCustomer);
        await _db.SaveChangesAsync();

        var otherSite = new Site
        {
            TenantId = otherTenant.Id, CustomerId = otherCustomer.Id, CreatedBy = otherUser.Id,
            Reference = "CH-OTHER", Subject = "Other", SiteAddress = "Other",
            CreatedAt = DateTime.UtcNow
        };
        _db.Sites.Add(otherSite);
        await _db.SaveChangesAsync();

        // Add assignment on other tenant's site (bypass query filter)
        _db.Database.ExecuteSqlRaw(
            "INSERT INTO site_assignments (tenant_id, site_id, user_id, created_at) VALUES ({0}, {1}, {2}, {3})",
            otherTenant.Id, otherSite.Id, otherUser.Id, DateTime.UtcNow);

        // Add assignment on our tenant
        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = null, EndDatetime = null, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _service.GetBySiteAsync(_siteId);

        Assert.Single(result);
        Assert.Equal(_ouvrierId, result[0].UserId);
    }

    // --- Batch Creation Test ---

    [Fact]
    public async Task CreateBatchAsync_CreatesMultipleAssignments_WithCorrectProperties()
    {
        var result = await _service.CreateBatchAsync(_siteId, new CreateBatchAssignmentRequest
        {
            Assignments =
            [
                new() { UserId = _ouvrierId, Mode = "full_duration" },
                new() { UserId = _ouvrier2Id, Mode = "date_preset", Date = "2026-04-10", PresetStartTime = "08:00", PresetEndTime = "12:00" }
            ]
        });

        Assert.Equal(2, result.Count);

        // Verify full_duration assignment properties
        var fullDuration = result.First(r => r.UserId == _ouvrierId);
        Assert.Null(fullDuration.StartDatetime);
        Assert.Null(fullDuration.EndDatetime);
        Assert.Equal("Martin Pierre", fullDuration.UserFullName);
        Assert.Equal(_siteId, fullDuration.SiteId);

        // Verify date_preset assignment properties
        var datePreset = result.First(r => r.UserId == _ouvrier2Id);
        Assert.Equal(new DateTime(2026, 4, 10, 8, 0, 0), datePreset.StartDatetime);
        Assert.Equal(new DateTime(2026, 4, 10, 12, 0, 0), datePreset.EndDatetime);
        Assert.Equal("Dupont Jean", datePreset.UserFullName);
        Assert.Equal(_siteId, datePreset.SiteId);

        // Verify audit logged for each assignment
        _auditServiceMock.Verify(a => a.LogEventAsync("SiteAssignment", It.IsAny<int>(), AuditAction.Created, It.IsAny<object>()), Times.Exactly(2));
    }

    // --- Review Fix Validation Tests ---

    [Fact]
    public async Task CreateAsync_InvalidMode_ThrowsAssignmentInvalidMode()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest { UserId = _ouvrierId, Mode = "bogus" }));
        Assert.Equal(ApiError.AssignmentInvalidMode, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_DatePresetOutsideSiteRange_ThrowsOutsideSiteDateRange()
    {
        // Site range is 2026-04-01 to 2026-04-30
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest
            {
                UserId = _ouvrierId, Mode = "date_preset",
                Date = "2026-05-15", PresetStartTime = "08:00", PresetEndTime = "12:00"
            }));
        Assert.Equal(ApiError.AssignmentOutsideSiteDateRange, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_StartWithoutEnd_ThrowsAssignmentInvalidDateRange()
    {
        var assignment = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = null, EndDatetime = null, CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(_siteId, assignment.Id, new UpdateAssignmentRequest
            {
                StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
                EndDatetime = null // start without end
            }));
        Assert.Equal(ApiError.AssignmentInvalidDateRange, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_WrongSiteId_ThrowsAssignmentNotFound()
    {
        var assignment = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = null, EndDatetime = null, CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(_site2Id, assignment.Id, new UpdateAssignmentRequest
            {
                StartDatetime = null, EndDatetime = null
            }));
        Assert.Equal(ApiError.AssignmentNotFound, ex.Code);
    }

    [Fact]
    public async Task DeleteAsync_WrongSiteId_ThrowsAssignmentNotFound()
    {
        var assignment = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = null, EndDatetime = null, CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.DeleteAsync(_site2Id, assignment.Id));
        Assert.Equal(ApiError.AssignmentNotFound, ex.Code);
    }

    // --- H9: Missing validation tests ---

    [Fact]
    public async Task CreateAsync_PresetInvalidTime_EndBeforeStart_ThrowsPresetInvalidTime()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest
            {
                UserId = _ouvrierId, Mode = "date_preset",
                Date = "2026-04-10", PresetStartTime = "17:00", PresetEndTime = "08:00"
            }));
        Assert.Equal(ApiError.AssignmentPresetInvalidTime, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_PresetInvalidTime_BadFormat_ThrowsPresetInvalidTime()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest
            {
                UserId = _ouvrierId, Mode = "date_preset",
                Date = "2026-04-10", PresetStartTime = "invalid", PresetEndTime = "12:00"
            }));
        Assert.Equal(ApiError.AssignmentPresetInvalidTime, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_RangePreset_EndBeforeStart_ThrowsInvalidDateRange()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest
            {
                UserId = _ouvrierId, Mode = "range_preset",
                StartDate = "2026-04-15", EndDate = "2026-04-10", // reversed
                PresetStartTime = "08:00", PresetEndTime = "12:00"
            }));
        Assert.Equal(ApiError.AssignmentInvalidDateRange, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_RangePreset_TooLarge_ThrowsRangeTooLarge()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(_siteId, new CreateAssignmentRequest
            {
                UserId = _ouvrierId, Mode = "range_preset",
                StartDate = "2026-04-01", EndDate = "2028-04-01", // > 365 days
                PresetStartTime = "08:00", PresetEndTime = "12:00"
            }));
        Assert.Equal(ApiError.AssignmentRangeTooLarge, ex.Code);
    }

    [Fact]
    public async Task CheckConflicts_WithExcludeId_DoesNotReportExcludedAssignment()
    {
        var assignment = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _site2Id, UserId = _ouvrierId,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 12, 0, 0),
            CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        // Check conflicts for the same time window but exclude the existing assignment
        var warnings = await _service.CheckConflictsAsync(
            _siteId, _ouvrierId,
            new DateTime(2026, 4, 10, 8, 0, 0),
            new DateTime(2026, 4, 10, 12, 0, 0),
            excludeAssignmentId: assignment.Id);

        Assert.Empty(warnings);
    }

    [Fact]
    public async Task CheckConflicts_NewFullDuration_ReturnsInfoForExistingPrecise()
    {
        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _site2Id, UserId = _ouvrierId,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 12, 0, 0),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        // New assignment is full_duration (null/null)
        var warnings = await _service.CheckConflictsAsync(_siteId, _ouvrierId, null, null);

        Assert.Single(warnings);
        Assert.Equal("info", warnings[0].Type);
        Assert.Contains("créneaux précis", warnings[0].Message);
    }

    // --- M12: Missing audit tests for DatePreset and RangePreset ---

    [Fact]
    public async Task CreateAsync_DatePreset_LogsAuditEvent()
    {
        await _service.CreateAsync(_siteId, new CreateAssignmentRequest
        {
            UserId = _ouvrierId, Mode = "date_preset",
            Date = "2026-04-10", PresetStartTime = "08:00", PresetEndTime = "12:00"
        });

        _auditServiceMock.Verify(a => a.LogEventAsync("SiteAssignment", It.IsAny<int>(), AuditAction.Created, It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_RangePreset_LogsAuditForEachDay()
    {
        await _service.CreateAsync(_siteId, new CreateAssignmentRequest
        {
            UserId = _ouvrierId, Mode = "range_preset",
            StartDate = "2026-04-10", EndDate = "2026-04-12",
            PresetStartTime = "08:00", PresetEndTime = "17:00"
        });

        // 3 days = 3 assignments = 3 audit events
        _auditServiceMock.Verify(a => a.LogEventAsync("SiteAssignment", It.IsAny<int>(), AuditAction.Created, It.IsAny<object>()), Times.Exactly(3));
    }

    // --- M11: Audit for ApplyAdjustments + null/null not impacted ---

    [Fact]
    public async Task ApplyAdjustmentsAsync_LogsAuditWithAdjustmentReason()
    {
        var assignment = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 16, 0, 0),
            CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        await _service.ApplyAdjustmentsAsync(_siteId, new List<AssignmentAdjustment>
        {
            new() { AssignmentId = assignment.Id, NewStartDatetime = new DateTime(2026, 4, 10, 8, 0, 0), NewEndDatetime = new DateTime(2026, 4, 10, 12, 0, 0) }
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "SiteAssignment",
            assignment.Id,
            AuditAction.Updated,
            It.Is<object>(o => o.ToString()!.Contains("AdjustmentAfterSiteDateChange"))),
            Times.Once);
    }

    [Fact]
    public async Task ApplyAdjustmentsAsync_MultipleAdjustments_LogsAuditForEach()
    {
        var a1 = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrierId,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 16, 0, 0),
            CreatedAt = DateTime.UtcNow
        };
        var a2 = new SiteAssignment
        {
            TenantId = _tenantId, SiteId = _siteId, UserId = _ouvrier2Id,
            StartDatetime = new DateTime(2026, 4, 11, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 11, 16, 0, 0),
            CreatedAt = DateTime.UtcNow
        };
        _db.SiteAssignments.AddRange(a1, a2);
        await _db.SaveChangesAsync();

        await _service.ApplyAdjustmentsAsync(_siteId, new List<AssignmentAdjustment>
        {
            new() { AssignmentId = a1.Id, NewStartDatetime = new DateTime(2026, 4, 10, 8, 0, 0), NewEndDatetime = new DateTime(2026, 4, 10, 12, 0, 0) },
            new() { AssignmentId = a2.Id, NewStartDatetime = new DateTime(2026, 4, 11, 8, 0, 0), NewEndDatetime = new DateTime(2026, 4, 11, 12, 0, 0) }
        });

        _auditServiceMock.Verify(a => a.LogEventAsync("SiteAssignment", It.IsAny<int>(), AuditAction.Updated, It.IsAny<object>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ApplyAdjustmentsAsync_AssignmentNotFound_Throws()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.ApplyAdjustmentsAsync(_siteId, new List<AssignmentAdjustment>
            {
                new() { AssignmentId = 9999, NewStartDatetime = DateTime.UtcNow, NewEndDatetime = DateTime.UtcNow.AddHours(1) }
            }));
        Assert.Equal(ApiError.AssignmentNotFound, ex.Code);
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
