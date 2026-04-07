using System.Security.Claims;
using BackEnd.API.Data;
using BackEnd.API.Services;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Sites;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace BackEnd.Tests;

public class SiteServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly SiteService _service;
    private readonly Mock<IAuditService> _auditServiceMock;
    private readonly TestTenantContext _tenantContext;
    private readonly int _tenantId;
    private readonly int _userId;
    private readonly int _customerId;

    public SiteServiceTests()
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

        // Seed user
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

        // Seed customer
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

        // Mock IHttpContextAccessor
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

    private CreateSiteRequest MakeValidRequest() => new()
    {
        CustomerId = _customerId,
        Subject = "Rénovation cuisine",
        SiteAddress = "12 rue de la Paix, 75002 Paris"
    };

    private async Task<int> SeedAcceptedQuoteAsync()
    {
        var quote = new Quote
        {
            TenantId = _tenantId,
            CustomerId = _customerId,
            CreatedBy = _userId,
            Reference = "DEV-2026-001",
            Subject = "Devis cuisine",
            Status = QuoteStatus.Accepted,
            SiteAddress = "12 rue de la Paix",
            CreatedAt = DateTime.UtcNow
        };
        _db.Quotes.Add(quote);
        await _db.SaveChangesAsync();
        return quote.Id;
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_FromQuote_ShouldPreserveQuoteLink()
    {
        var quoteId = await SeedAcceptedQuoteAsync();
        var request = MakeValidRequest();
        request.QuoteId = quoteId;

        var result = await _service.CreateAsync(request);

        Assert.NotEqual(0, result.Id);
        Assert.Equal(quoteId, result.QuoteId);
        Assert.Equal("DEV-2026-001", result.QuoteReference);
        Assert.Equal("Planned", result.Status);
    }

    [Fact]
    public async Task CreateAsync_Independent_ShouldCreateWithoutQuote()
    {
        var request = MakeValidRequest();

        var result = await _service.CreateAsync(request);

        Assert.NotEqual(0, result.Id);
        Assert.Null(result.QuoteId);
        Assert.Null(result.QuoteReference);
        Assert.Equal("Planned", result.Status);
        Assert.Equal("Dupont Jean", result.CustomerName);
    }

    [Fact]
    public async Task CreateAsync_QuoteNotAccepted_ShouldThrow()
    {
        var quote = new Quote
        {
            TenantId = _tenantId,
            CustomerId = _customerId,
            CreatedBy = _userId,
            Reference = "DEV-2026-002",
            Subject = "Draft devis",
            Status = QuoteStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };
        _db.Quotes.Add(quote);
        await _db.SaveChangesAsync();

        var request = MakeValidRequest();
        request.QuoteId = quote.Id;

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteQuoteNotAccepted, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_QuoteCustomerMismatch_ShouldThrow()
    {
        // Create a second customer
        var otherCustomer = new Customer
        {
            TenantId = _tenantId,
            LastName = "Martin",
            FirstName = "Pierre",
            CreatedAt = DateTime.UtcNow
        };
        _db.Customers.Add(otherCustomer);
        await _db.SaveChangesAsync();

        var quoteId = await SeedAcceptedQuoteAsync(); // quote is linked to _customerId

        var request = MakeValidRequest();
        request.QuoteId = quoteId;
        request.CustomerId = otherCustomer.Id; // different customer than the quote

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteCustomerNotFound, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomerNotFound_ShouldThrow()
    {
        var request = MakeValidRequest();
        request.CustomerId = 9999;

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteCustomerNotFound, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_MissingSubject_ShouldThrow()
    {
        var request = MakeValidRequest();
        request.Subject = "";

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteSubjectRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_MissingAddress_ShouldThrow()
    {
        var request = MakeValidRequest();
        request.SiteAddress = "";

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteAddressRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_RequiredForSiteConversion_Missing_ShouldThrow()
    {
        // Seed a custom field definition with RequiredForSiteConversion
        var fieldDef = new CustomFieldDefinition
        {
            TenantId = _tenantId,
            Label = "Type de sol",
            FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.RequiredForSiteConversion,
            AppliesToQuotes = true,
            AppliesToSites = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(fieldDef);
        await _db.SaveChangesAsync();

        var request = MakeValidRequest();
        // No custom fields provided → should fail

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteCustomFieldRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_ShouldLogAuditEvent()
    {
        var request = MakeValidRequest();

        await _service.CreateAsync(request);

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Site",
            It.IsAny<int>(),
            AuditAction.Created,
            It.IsAny<object>()
        ), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_SubjectTooLong_ShouldThrow()
    {
        var request = MakeValidRequest();
        request.Subject = new string('A', 501);

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteSubjectTooLong, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_AddressTooLong_ShouldThrow()
    {
        var request = MakeValidRequest();
        request.SiteAddress = new string('A', 1001);

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteAddressTooLong, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_NotesTooLong_ShouldThrow()
    {
        var request = MakeValidRequest();
        request.Notes = new string('A', 5001);

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteNotesTooLong, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_ShouldGenerateSequentialReference()
    {
        var request1 = MakeValidRequest();
        var result1 = await _service.CreateAsync(request1);

        var request2 = MakeValidRequest();
        request2.Subject = "Deuxième chantier";
        var result2 = await _service.CreateAsync(request2);

        Assert.StartsWith("CH-", result1.Reference);
        Assert.StartsWith("CH-", result2.Reference);
        Assert.EndsWith("-001", result1.Reference);
        Assert.EndsWith("-002", result2.Reference);
    }

    [Fact]
    public async Task CreateAsync_EndDateBeforeStartDate_ShouldThrow()
    {
        var request = MakeValidRequest();
        request.StartDate = "2026-06-01";
        request.EndDate = "2026-05-01";

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.SiteEndDateBeforeStartDate, ex.Code);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ShouldReturnWithCustomerAndQuote()
    {
        var quoteId = await SeedAcceptedQuoteAsync();
        var request = MakeValidRequest();
        request.QuoteId = quoteId;
        var created = await _service.CreateAsync(request);

        var result = await _service.GetByIdAsync(created.Id);

        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal("Dupont Jean", result.CustomerName);
        Assert.Equal(quoteId, result.QuoteId);
        Assert.Equal("DEV-2026-001", result.QuoteReference);
    }

    [Fact]
    public async Task GetByIdAsync_NotFound_ShouldReturnNull()
    {
        var result = await _service.GetByIdAsync(9999);
        Assert.Null(result);
    }

    // --- SearchAsync ---

    [Fact]
    public async Task SearchAsync_ShouldMatchOnSubjectAndCustomerName()
    {
        await _service.CreateAsync(MakeValidRequest());

        var bySubject = await _service.SearchAsync("cuisine");
        Assert.Single(bySubject);
        Assert.Equal("Rénovation cuisine", bySubject[0].Subject);

        var byCustomer = await _service.SearchAsync("Dupont");
        Assert.Single(byCustomer);
        Assert.Equal("Dupont Jean", byCustomer[0].CustomerName);
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_ExistingSite_ShouldRemoveFromDb()
    {
        var created = await _service.CreateAsync(MakeValidRequest());

        await _service.DeleteAsync(created.Id);

        var result = await _service.GetByIdAsync(created.Id);
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_NotFound_ShouldThrow()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.DeleteAsync(9999));
        Assert.Equal(ApiError.SiteNotFound, ex.Code);
    }

    [Fact]
    public async Task DeleteAsync_ShouldLogAuditEvent()
    {
        var created = await _service.CreateAsync(MakeValidRequest());
        _auditServiceMock.Reset();

        await _service.DeleteAsync(created.Id);

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Site",
            created.Id,
            AuditAction.Deleted,
            null
        ), Times.Once);
    }

    // --- GetByCustomerAsync ---

    [Fact]
    public async Task GetByCustomerAsync_ShouldReturnOnlyCustomerSites()
    {
        await _service.CreateAsync(MakeValidRequest());

        var otherCustomer = new Customer
        {
            TenantId = _tenantId,
            LastName = "Martin",
            FirstName = "Pierre",
            CreatedAt = DateTime.UtcNow
        };
        _db.Customers.Add(otherCustomer);
        await _db.SaveChangesAsync();

        await _service.CreateAsync(new CreateSiteRequest
        {
            CustomerId = otherCustomer.Id,
            Subject = "Autre chantier",
            SiteAddress = "Ailleurs"
        });

        var results = await _service.GetByCustomerAsync(_customerId);
        Assert.Single(results);
        Assert.Equal("Rénovation cuisine", results[0].Subject);
    }

    // --- C4: DetectAssignmentAdjustmentsAsync (triggered via UpdateAsync) ---

    [Fact]
    public async Task UpdateAsync_ReducedEndDate_ProposesAdjustmentsForPreciseAssignments()
    {
        // Create site with wide date range
        var site = await _service.CreateAsync(new CreateSiteRequest
        {
            CustomerId = _customerId, Subject = "Chantier ajustement",
            SiteAddress = "1 rue test", StartDate = "2026-04-01", EndDate = "2026-04-30"
        });

        // Seed an ouvrier for assignments
        var ouvrier = new User
        {
            TenantId = _tenantId, Email = "ouv-adj@test.fr", PasswordHash = "hash",
            FirstName = "Paul", LastName = "Adjuster", Role = UserRole.Ouvrier, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(ouvrier);
        await _db.SaveChangesAsync();

        // Add a precise assignment that goes beyond the new end date
        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = site.Id, UserId = ouvrier.Id,
            StartDatetime = new DateTime(2026, 4, 20, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 25, 17, 0, 0),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        // Reduce end date to April 22 — assignment ends Apr 25, should be proposed for adjustment
        var result = await _service.UpdateAsync(site.Id, new UpdateSiteRequest
        {
            Subject = "Chantier ajustement", SiteAddress = "1 rue test",
            StartDate = "2026-04-01", EndDate = "2026-04-22"
        });

        Assert.NotNull(result.ProposedAdjustments);
        Assert.Single(result.ProposedAdjustments);
        Assert.Equal(ouvrier.Id, result.ProposedAdjustments[0].AssignmentId > 0 ? _db.SiteAssignments.First(a => a.UserId == ouvrier.Id).UserId : 0);
        Assert.Equal("Adjuster Paul", result.ProposedAdjustments[0].UserFullName);
        Assert.Equal(new DateTime(2026, 4, 25, 17, 0, 0), result.ProposedAdjustments[0].OldEndDatetime);
        // New end should be clamped to site end date (22 April 23:59:59.9999999)
        Assert.True(result.ProposedAdjustments[0].NewEndDatetime <= new DateTime(2026, 4, 23, 0, 0, 0));
    }

    [Fact]
    public async Task UpdateAsync_ReducedDates_FullDurationNotImpacted()
    {
        var site = await _service.CreateAsync(new CreateSiteRequest
        {
            CustomerId = _customerId, Subject = "Chantier full",
            SiteAddress = "2 rue test", StartDate = "2026-04-01", EndDate = "2026-04-30"
        });

        var ouvrier = new User
        {
            TenantId = _tenantId, Email = "ouv-full@test.fr", PasswordHash = "hash",
            FirstName = "Luc", LastName = "Full", Role = UserRole.Ouvrier, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(ouvrier);
        await _db.SaveChangesAsync();

        // Full duration assignment (null/null) — should NOT be impacted
        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = site.Id, UserId = ouvrier.Id,
            StartDatetime = null, EndDatetime = null, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _service.UpdateAsync(site.Id, new UpdateSiteRequest
        {
            Subject = "Chantier full", SiteAddress = "2 rue test",
            StartDate = "2026-04-05", EndDate = "2026-04-20"
        });

        Assert.Null(result.ProposedAdjustments);
    }

    [Fact]
    public async Task UpdateAsync_NoDatesChange_NoAdjustmentsProposed()
    {
        var site = await _service.CreateAsync(new CreateSiteRequest
        {
            CustomerId = _customerId, Subject = "Chantier stable",
            SiteAddress = "3 rue test", StartDate = "2026-04-01", EndDate = "2026-04-30"
        });

        var ouvrier = new User
        {
            TenantId = _tenantId, Email = "ouv-stable@test.fr", PasswordHash = "hash",
            FirstName = "Marc", LastName = "Stable", Role = UserRole.Ouvrier, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(ouvrier);
        await _db.SaveChangesAsync();

        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = site.Id, UserId = ouvrier.Id,
            StartDatetime = new DateTime(2026, 4, 10, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 10, 12, 0, 0),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        // Only change subject, not dates
        var result = await _service.UpdateAsync(site.Id, new UpdateSiteRequest
        {
            Subject = "Chantier renommé", SiteAddress = "3 rue test",
            StartDate = "2026-04-01", EndDate = "2026-04-30"
        });

        Assert.Null(result.ProposedAdjustments);
    }

    [Fact]
    public async Task UpdateAsync_ReducedStartDate_ProposesAdjustmentForEarlyAssignment()
    {
        var site = await _service.CreateAsync(new CreateSiteRequest
        {
            CustomerId = _customerId, Subject = "Chantier start",
            SiteAddress = "4 rue test", StartDate = "2026-04-01", EndDate = "2026-04-30"
        });

        var ouvrier = new User
        {
            TenantId = _tenantId, Email = "ouv-early@test.fr", PasswordHash = "hash",
            FirstName = "Léo", LastName = "Early", Role = UserRole.Ouvrier, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(ouvrier);
        await _db.SaveChangesAsync();

        // Assignment starts on April 2 — if we push start to April 5, it needs adjustment
        _db.SiteAssignments.Add(new SiteAssignment
        {
            TenantId = _tenantId, SiteId = site.Id, UserId = ouvrier.Id,
            StartDatetime = new DateTime(2026, 4, 2, 8, 0, 0),
            EndDatetime = new DateTime(2026, 4, 2, 17, 0, 0),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _service.UpdateAsync(site.Id, new UpdateSiteRequest
        {
            Subject = "Chantier start", SiteAddress = "4 rue test",
            StartDate = "2026-04-05", EndDate = "2026-04-30"
        });

        // Assignment (April 2, 8h-17h) is entirely before new site start (April 5)
        // Clamp would produce newStart > newEnd → skipped (no valid adjustment possible)
        Assert.Null(result.ProposedAdjustments);
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
