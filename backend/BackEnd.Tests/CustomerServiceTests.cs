using BackEnd.API.Data;
using BackEnd.API.Services;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Customers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace BackEnd.Tests;

public class CustomerServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly CustomerService _service;
    private readonly Mock<IAuditService> _auditServiceMock;
    private readonly TestTenantContext _tenantContext;
    private readonly int _tenantId;

    public CustomerServiceTests()
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

        _auditServiceMock = new Mock<IAuditService>();

        _service = new CustomerService(_db, _tenantContext, _auditServiceMock.Object, NullLogger<CustomerService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task CreateAsync_ValidData_CreatesCustomer()
    {
        var request = new CreateCustomerRequest
        {
            LastName = "Dupont",
            FirstName = "Jean",
            Telephone = "0601020304",
            Email = "jean@dupont.fr",
            Address = "1 rue de Paris"
        };

        var result = await _service.CreateAsync(request);

        Assert.NotEqual(0, result.Id);
        Assert.Equal("Dupont", result.LastName);
        Assert.Equal("Jean", result.FirstName);
        Assert.Equal("0601020304", result.Telephone);
        Assert.Equal("jean@dupont.fr", result.Email);
        Assert.Equal("1 rue de Paris", result.Address);

        var inDb = await _db.Customers.FirstOrDefaultAsync(c => c.Id == result.Id);
        Assert.NotNull(inDb);
        Assert.Equal(_tenantId, inDb.TenantId);
    }

    [Fact]
    public async Task CreateAsync_EmptyLastName_ThrowsCustomerLastNameRequired()
    {
        var request = new CreateCustomerRequest { LastName = "", FirstName = "Jean" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.CustomerLastNameRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_WhitespaceLastName_ThrowsCustomerLastNameRequired()
    {
        var request = new CreateCustomerRequest { LastName = "   ", FirstName = "Jean" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.CustomerLastNameRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_EmptyFirstName_ThrowsCustomerFirstNameRequired()
    {
        var request = new CreateCustomerRequest { LastName = "Dupont", FirstName = "" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.CustomerFirstNameRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_InvalidEmail_ThrowsCustomerInvalidEmail()
    {
        var request = new CreateCustomerRequest { LastName = "Dupont", FirstName = "Jean", Email = "invalid-email" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.CustomerInvalidEmail, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_LogsAuditEventCreated()
    {
        var request = new CreateCustomerRequest { LastName = "Dupont", FirstName = "Jean" };

        await _service.CreateAsync(request);

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Customer",
            It.IsAny<int>(),
            AuditAction.Created,
            It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsCustomersSortedByLastName()
    {
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Zorro", FirstName = "Jean", CreatedAt = DateTime.UtcNow });
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Albert", FirstName = "Marie", CreatedAt = DateTime.UtcNow });
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Albert", FirstName = "Anne", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        var result = await _service.GetAllAsync();

        Assert.Equal(3, result.Count);
        Assert.Equal("Albert", result[0].LastName);
        Assert.Equal("Anne", result[0].FirstName);
        Assert.Equal("Albert", result[1].LastName);
        Assert.Equal("Marie", result[1].FirstName);
        Assert.Equal("Zorro", result[2].LastName);
    }

    [Fact]
    public async Task GetByIdAsync_ExistingCustomer_ReturnsCustomer()
    {
        var customer = new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        var result = await _service.GetByIdAsync(customer.Id);

        Assert.NotNull(result);
        Assert.Equal("Dupont", result.LastName);
        Assert.Equal("Jean", result.FirstName);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistingId_ReturnsNull()
    {
        var result = await _service.GetByIdAsync(99999);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_ValidData_UpdatesFieldsAndLogsAudit()
    {
        var customer = new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", Email = "old@test.fr", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        var request = new UpdateCustomerRequest { LastName = "Martin", FirstName = "Jean", Email = "new@test.fr" };

        var result = await _service.UpdateAsync(customer.Id, request);

        Assert.Equal("Martin", result.LastName);
        Assert.Equal("new@test.fr", result.Email);
        Assert.NotNull(result.UpdatedAt);

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Customer",
            customer.Id,
            AuditAction.Updated,
            It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_NonExistingCustomer_ThrowsCustomerNotFound()
    {
        var request = new UpdateCustomerRequest { LastName = "Martin", FirstName = "Jean" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.UpdateAsync(99999, request));
        Assert.Equal(ApiError.CustomerNotFound, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_EmptyLastName_ThrowsCustomerLastNameRequired()
    {
        var customer = new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        var request = new UpdateCustomerRequest { LastName = "", FirstName = "Jean" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.UpdateAsync(customer.Id, request));
        Assert.Equal(ApiError.CustomerLastNameRequired, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_EmptyFirstName_ThrowsCustomerFirstNameRequired()
    {
        var customer = new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        var request = new UpdateCustomerRequest { LastName = "Dupont", FirstName = "" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.UpdateAsync(customer.Id, request));
        Assert.Equal(ApiError.CustomerFirstNameRequired, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_InvalidEmail_ThrowsCustomerInvalidEmail()
    {
        var customer = new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        var request = new UpdateCustomerRequest { LastName = "Dupont", FirstName = "Jean", Email = "bad-email" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.UpdateAsync(customer.Id, request));
        Assert.Equal(ApiError.CustomerInvalidEmail, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_NoChanges_DoesNotLogAuditEvent()
    {
        var customer = new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        var request = new UpdateCustomerRequest { LastName = "Dupont", FirstName = "Jean" };

        await _service.UpdateAsync(customer.Id, request);

        _auditServiceMock.Verify(a => a.LogEventAsync(
            It.IsAny<string>(),
            It.IsAny<int>(),
            AuditAction.Updated,
            It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task GetAllAsync_TenantIsolation_DoesNotReturnOtherTenantCustomers()
    {
        // Add customer for current tenant
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        // Add another tenant with a customer (bypass query filter via raw SQL)
        var otherTenant = new Tenant { Name = "Other Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        await _db.SaveChangesAsync();

        _db.Database.ExecuteSqlRaw(
            "INSERT INTO customers (tenant_id, last_name, first_name, created_at) VALUES ({0}, 'Other', 'Customer', datetime('now'))",
            otherTenant.Id);

        var result = await _service.GetAllAsync();

        Assert.Single(result);
        Assert.Equal("Dupont", result[0].LastName);
    }

    // --- SearchAsync ---

    [Fact]
    public async Task SearchAsync_ValidQuery_ReturnsMatchingCustomers()
    {
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Lefebvre", FirstName = "Marie", CreatedAt = DateTime.UtcNow });
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow });
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Lefranc", FirstName = "Pierre", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        var result = await _service.SearchAsync("Lef");

        Assert.Equal(2, result.Count);
        Assert.All(result, r => Assert.Contains("Lef", r.LastName, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task SearchAsync_SearchesInAllFields()
    {
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Martin", FirstName = "Lefebvre", CreatedAt = DateTime.UtcNow });
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", Telephone = "0601020304", CreatedAt = DateTime.UtcNow });
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Albert", FirstName = "Paul", Email = "lef@test.fr", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        // Search by FirstName
        var byFirstName = await _service.SearchAsync("Lefebvre");
        Assert.Single(byFirstName);
        Assert.Equal("Martin", byFirstName[0].LastName);

        // Search by Telephone
        var byPhone = await _service.SearchAsync("060102");
        Assert.Single(byPhone);
        Assert.Equal("Dupont", byPhone[0].LastName);

        // Search by Email
        var byEmail = await _service.SearchAsync("lef@test");
        Assert.Single(byEmail);
        Assert.Equal("Albert", byEmail[0].LastName);
    }

    [Fact]
    public async Task SearchAsync_QueryLessThan2Chars_ReturnsEmptyList()
    {
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        var result = await _service.SearchAsync("D");

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchAsync_EmptyQuery_ReturnsEmptyList()
    {
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        var resultEmpty = await _service.SearchAsync("");
        var resultNull = await _service.SearchAsync(null!);
        var resultWhitespace = await _service.SearchAsync("   ");

        Assert.Empty(resultEmpty);
        Assert.Empty(resultNull);
        Assert.Empty(resultWhitespace);
    }

    [Fact]
    public async Task SearchAsync_RespectsLimit()
    {
        for (int i = 0; i < 5; i++)
            _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = $"Dupont{i}", FirstName = "Jean", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        var result = await _service.SearchAsync("Dupont", 2);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task SearchAsync_ReturnsSortedByLastNameThenFirstName()
    {
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Zorro", FirstName = "Anne", CreatedAt = DateTime.UtcNow });
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Albert", FirstName = "Marie", CreatedAt = DateTime.UtcNow });
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Albert", FirstName = "Anne", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        var result = await _service.SearchAsync("Al");

        Assert.Equal(2, result.Count);
        Assert.Equal("Albert", result[0].LastName);
        Assert.Equal("Anne", result[0].FirstName);
        Assert.Equal("Albert", result[1].LastName);
        Assert.Equal("Marie", result[1].FirstName);
    }

    [Fact]
    public async Task SearchAsync_TenantIsolation_DoesNotReturnOtherTenantCustomers()
    {
        _db.Customers.Add(new Customer { TenantId = _tenantId, LastName = "Dupont", FirstName = "Jean", CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        // Add another tenant with a customer (bypass query filter via raw SQL)
        var otherTenant = new Tenant { Name = "Other Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        await _db.SaveChangesAsync();

        _db.Database.ExecuteSqlRaw(
            "INSERT INTO customers (tenant_id, last_name, first_name, created_at) VALUES ({0}, 'Dupuis', 'Marc', datetime('now'))",
            otherTenant.Id);

        var result = await _service.SearchAsync("Dup");

        Assert.Single(result);
        Assert.Equal("Dupont", result[0].LastName);
    }

    // --- SearchAsync QuoteCount ---

    [Fact]
    public async Task SearchAsync_CustomerWithQuotes_ReturnsCorrectQuoteCount()
    {
        var customer = new Customer { TenantId = _tenantId, LastName = "QuoteTest", FirstName = "Client", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        // Seed a user for CreatedBy
        var user = new User
        {
            TenantId = _tenantId, Email = "quotetest@test.fr", PasswordHash = "hash",
            FirstName = "Test", LastName = "User", Role = UserRole.Chef, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Create 3 quotes for this customer
        for (int i = 0; i < 3; i++)
        {
            _db.Quotes.Add(new Quote
            {
                TenantId = _tenantId,
                CustomerId = customer.Id,
                CreatedBy = user.Id,
                Reference = $"DEV-2026-{i + 100:000}",
                Subject = $"Quote {i}",
                CreatedAt = DateTime.UtcNow
            });
        }
        await _db.SaveChangesAsync();

        var result = await _service.SearchAsync("QuoteTest");

        Assert.Single(result);
        Assert.Equal(3, result[0].QuoteCount);
    }

    [Fact]
    public async Task SearchAsync_CustomerWithoutQuotes_ReturnsZeroQuoteCount()
    {
        var customer = new Customer { TenantId = _tenantId, LastName = "NoQuotes", FirstName = "Client", CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        var result = await _service.SearchAsync("NoQuotes");

        Assert.Single(result);
        Assert.Equal(0, result[0].QuoteCount);
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
