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

public class QuoteServiceRemindersTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly QuoteService _service;
    private readonly TestTenantContext _tenantContext;
    private readonly int _tenantId;
    private readonly int _otherTenantId;
    private readonly int _userId;
    private readonly int _customerId;

    public QuoteServiceRemindersTests()
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

        _service = new QuoteService(_db, _tenantContext, auditServiceMock.Object,
            httpContextAccessorMock.Object, NullLogger<QuoteService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private int _refCounter;

    private Quote CreateQuote(DateOnly? reminderDate, QuoteStatus status = QuoteStatus.Draft, int? tenantId = null)
    {
        _refCounter++;
        var quote = new Quote
        {
            TenantId = tenantId ?? _tenantId,
            CustomerId = _customerId,
            CreatedBy = _userId,
            Reference = $"DEV-2026-{_refCounter:000}",
            Subject = $"Devis {_refCounter}",
            Status = status,
            ReminderDate = reminderDate,
            CreatedAt = DateTime.UtcNow
        };
        _db.Quotes.Add(quote);
        return quote;
    }

    // --- Task 1.4: Filtrage par plage de dates ---

    [Fact]
    public async Task GetReminders_ShouldReturnRemindersInDateRange()
    {
        CreateQuote(new DateOnly(2026, 4, 5));
        CreateQuote(new DateOnly(2026, 4, 15));
        CreateQuote(new DateOnly(2026, 5, 1)); // outside range
        _db.SaveChanges();

        var result = await _service.GetRemindersAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetReminders_ShouldReturnAllStatuses()
    {
        CreateQuote(new DateOnly(2026, 4, 5), QuoteStatus.Draft);
        CreateQuote(new DateOnly(2026, 4, 10), QuoteStatus.Sent);
        CreateQuote(new DateOnly(2026, 4, 15), QuoteStatus.Accepted);
        CreateQuote(new DateOnly(2026, 4, 20), QuoteStatus.Refused);
        _db.SaveChanges();

        var result = await _service.GetRemindersAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Equal(4, result.Count);
        var statuses = result.Select(r => r.Status).ToHashSet();
        Assert.Contains("Draft", statuses);
        Assert.Contains("Sent", statuses);
        Assert.Contains("Accepted", statuses);
        Assert.Contains("Refused", statuses);
    }

    // --- Task 1.4: Tenant isolation ---

    [Fact]
    public async Task GetReminders_ShouldRespectTenantIsolation()
    {
        CreateQuote(new DateOnly(2026, 4, 5)); // current tenant
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

        // Create quote for other tenant
        _db.Quotes.Add(new Quote
        {
            TenantId = _otherTenantId,
            CustomerId = otherCustomer.Id,
            CreatedBy = otherUser.Id,
            Reference = "DEV-OTHER-001",
            Subject = "Other Quote",
            Status = QuoteStatus.Draft,
            ReminderDate = new DateOnly(2026, 4, 10),
            CreatedAt = DateTime.UtcNow
        });
        _db.SaveChanges();

        // Switch back to original tenant
        _tenantContext.TenantId = _tenantId;

        var result = await _service.GetRemindersAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Single(result);
    }

    // --- Task 1.5: Edge cases ---

    [Fact]
    public async Task GetReminders_ShouldExcludeQuotesWithNullReminderDate()
    {
        CreateQuote(new DateOnly(2026, 4, 5));
        CreateQuote(null); // no reminder date
        _db.SaveChanges();

        var result = await _service.GetRemindersAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Single(result);
    }

    [Fact]
    public async Task GetReminders_EmptyRange_ShouldReturnEmpty()
    {
        CreateQuote(new DateOnly(2026, 4, 5));
        _db.SaveChanges();

        var result = await _service.GetRemindersAsync(new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 30));

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetReminders_ShouldReturnCorrectDtoFields()
    {
        var quote = CreateQuote(new DateOnly(2026, 4, 5), QuoteStatus.Sent);
        _db.SaveChanges();

        var result = await _service.GetRemindersAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        var dto = result[0];
        Assert.Equal(quote.Id, dto.Id);
        Assert.Equal(quote.Reference, dto.Reference);
        Assert.Equal(quote.Subject, dto.Subject);
        Assert.Equal("Dupont Jean", dto.CustomerName);
        Assert.Equal("2026-04-05", dto.ReminderDate);
        Assert.Equal("Sent", dto.Status);
    }

    [Fact]
    public async Task GetReminders_BoundaryDates_ShouldBeInclusive()
    {
        CreateQuote(new DateOnly(2026, 4, 1));  // start boundary
        CreateQuote(new DateOnly(2026, 4, 30)); // end boundary
        _db.SaveChanges();

        var result = await _service.GetRemindersAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.Equal(2, result.Count);
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
