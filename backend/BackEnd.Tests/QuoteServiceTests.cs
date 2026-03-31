using System.Security.Claims;
using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.API.Services;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.CustomFields;
using BackEnd.Shared.Models.Quotes;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace BackEnd.Tests;

public class QuoteServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly QuoteService _service;
    private readonly Mock<IAuditService> _auditServiceMock;
    private readonly TestTenantContext _tenantContext;
    private readonly int _tenantId;
    private readonly int _userId;
    private readonly int _customerId;

    public QuoteServiceTests()
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

        // Seed CompanyInfo
        var companyInfo = new CompanyInfo
        {
            TenantId = _tenantId,
            CompanyName = "Baterio SAS",
            LegalForm = "SAS",
            Siret = "12345678901234",
            VatNumber = "FR12345678901",
            InsuranceProvider = "AXA",
            InsurancePolicyNumber = "POL-001",
            InsuranceCoverage = "Garantie décennale",
            DefaultPaymentTerms = "30 jours fin de mois",
            CreatedAt = DateTime.UtcNow
        };
        _db.CompanyInfos.Add(companyInfo);
        _db.SaveChanges();

        _auditServiceMock = new Mock<IAuditService>();

        // Mock IHttpContextAccessor
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _userId.ToString())
        }));
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        _service = new QuoteService(_db, _tenantContext, _auditServiceMock.Object,
            httpContextAccessorMock.Object, NullLogger<QuoteService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_ValidData_CreatesQuoteWithGeneratedReference()
    {
        var request = new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Rénovation cuisine"
        };

        var result = await _service.CreateAsync(request);

        Assert.NotEqual(0, result.Id);
        Assert.StartsWith("DEV-", result.Reference);
        Assert.Equal("Rénovation cuisine", result.Subject);
        Assert.Equal("Draft", result.Status);
        Assert.Equal("Normal", result.Priority);
        Assert.Equal("Dupont Jean", result.CustomerName);
    }

    [Fact]
    public async Task CreateAsync_WithLines_CalculatesTotals()
    {
        var request = new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Travaux",
            TaxRate = 20m,
            Lines =
            [
                new QuoteLineRequest { Description = "Main d'oeuvre", Quantity = 10, UnitPriceExclTax = 50m, DisplayOrder = 0 },
                new QuoteLineRequest { Description = "Matériaux", Quantity = 1, UnitPriceExclTax = 200m, DisplayOrder = 1 }
            ]
        };

        var result = await _service.CreateAsync(request);

        Assert.Equal(700m, result.AmountExclTax); // 10*50 + 1*200
        Assert.Equal(840m, result.AmountInclTax);  // 700 * 1.20
        Assert.Equal(2, result.Lines.Count);
        Assert.Equal(500m, result.Lines[0].LineTotalExclTax); // 10*50
        Assert.Equal(200m, result.Lines[1].LineTotalExclTax); // 1*200
    }

    [Fact]
    public async Task CreateAsync_GeneratesLegalMentionsFromCompanyInfo()
    {
        var request = new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test mentions"
        };

        var result = await _service.CreateAsync(request);

        Assert.NotNull(result.LegalMentions);
        Assert.Contains("Baterio SAS", result.LegalMentions);
        Assert.Contains("SIRET : 12345678901234", result.LegalMentions);
        Assert.Contains("TVA : FR12345678901", result.LegalMentions);
        Assert.Contains("AXA", result.LegalMentions);
        Assert.Contains("30 jours fin de mois", result.LegalMentions);
    }

    [Fact]
    public async Task CreateAsync_LogsAuditEventCreated()
    {
        var request = new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Audit test"
        };

        await _service.CreateAsync(request);

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote",
            It.IsAny<int>(),
            AuditAction.Created,
            It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ZeroCustomerId_ThrowsQuoteCustomerRequired()
    {
        var request = new CreateQuoteRequest { CustomerId = 0, Subject = "Test" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.QuoteCustomerRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_EmptySubject_ThrowsQuoteSubjectRequired()
    {
        var request = new CreateQuoteRequest { CustomerId = _customerId, Subject = "" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.QuoteSubjectRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_WhitespaceSubject_ThrowsQuoteSubjectRequired()
    {
        var request = new CreateQuoteRequest { CustomerId = _customerId, Subject = "   " };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.QuoteSubjectRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_NonExistingCustomer_ThrowsQuoteCustomerNotFound()
    {
        var request = new CreateQuoteRequest { CustomerId = 99999, Subject = "Test" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.QuoteCustomerNotFound, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_InvalidPriority_ThrowsQuoteInvalidPriority()
    {
        var request = new CreateQuoteRequest { CustomerId = _customerId, Subject = "Test", Priority = "Urgent" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.CreateAsync(request));
        Assert.Equal(ApiError.QuoteInvalidPriority, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_NoUserClaim_ThrowsUnauthorized()
    {
        // Create a service with no user claims in HttpContext
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var httpContext = new DefaultHttpContext(); // No claims set
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        var serviceNoUser = new QuoteService(_db, _tenantContext, _auditServiceMock.Object,
            httpContextAccessorMock.Object, NullLogger<QuoteService>.Instance);

        var request = new CreateQuoteRequest { CustomerId = _customerId, Subject = "Test" };

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => serviceNoUser.CreateAsync(request));
        Assert.Equal(ApiError.Unauthorized, ex.Code);
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task UpdateAsync_ValidData_UpdatesQuote()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Original"
        });

        var result = await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Updated subject",
            Notes = "New notes",
            Priority = "High"
        });

        Assert.Equal("Updated subject", result.Subject);
        Assert.Equal("New notes", result.Notes);
        Assert.Equal("High", result.Priority);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_NewLinesWithoutId_DeletesOldAndCreatesNewAndRecalculatesTotals()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test",
            TaxRate = 10m,
            Lines =
            [
                new QuoteLineRequest { Description = "Old line", Quantity = 1, UnitPriceExclTax = 100m, DisplayOrder = 0 }
            ]
        });

        var result = await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test",
            TaxRate = 10m,
            Lines =
            [
                new QuoteLineRequest { Description = "New line 1", Quantity = 2, UnitPriceExclTax = 50m, DisplayOrder = 0 },
                new QuoteLineRequest { Description = "New line 2", Quantity = 3, UnitPriceExclTax = 30m, DisplayOrder = 1 }
            ]
        });

        Assert.Equal(2, result.Lines.Count);
        Assert.Equal("New line 1", result.Lines[0].Description);
        Assert.Equal("New line 2", result.Lines[1].Description);
        Assert.Equal(190m, result.AmountExclTax);  // 2*50 + 3*30
        Assert.Equal(209m, result.AmountInclTax);   // 190 * 1.10
    }

    [Fact]
    public async Task UpdateAsync_WithChanges_LogsAuditEventUpdated()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Original"
        });
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Changed",
            Notes = "New notes"
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote",
            created.Id,
            AuditAction.Updated,
            It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_NonExistingQuote_ThrowsQuoteNotFound()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(99999, new UpdateQuoteRequest { Subject = "Test" }));
        Assert.Equal(ApiError.QuoteNotFound, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_InvalidPriority_ThrowsQuoteInvalidPriority()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Original"
        });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(created.Id, new UpdateQuoteRequest { Subject = "Test", Priority = "Urgent" }));
        Assert.Equal(ApiError.QuoteInvalidPriority, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_EmptySubject_ThrowsQuoteSubjectRequired()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Original"
        });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(created.Id, new UpdateQuoteRequest { Subject = "" }));
        Assert.Equal(ApiError.QuoteSubjectRequired, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_NoChanges_DoesNotLogAuditEvent()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Same"
        });
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Same"
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            It.IsAny<string>(),
            It.IsAny<int>(),
            AuditAction.Updated,
            It.IsAny<object>()), Times.Never);
    }

    // --- UpdateAsync: CustomFields granular diff ---

    [Fact]
    public async Task UpdateAsync_CustomFieldModified_LogsGranularDiffWithIdAndLabel()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Type de travaux", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "CF Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Type de travaux", Value = "Renovation" }
            }
        });
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "CF Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Type de travaux", Value = "Neuf" }
            }
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", created.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.ContainsKey($"CustomFields:{cfd.Id}:Type de travaux"))),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_CustomFieldUnchanged_AbsentFromDiff()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Surface", FieldType = FieldType.Number,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var cf = new List<CustomFieldEntry>
        {
            new() { Id = cfd.Id, Label = "Surface", Value = 100 }
        };
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Same CF", CustomFields = cf
        });
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Changed Subject", CustomFields = cf
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", created.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.ContainsKey("Subject") && !d.Keys.Any(k => k.StartsWith("CustomFields")))),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_CustomFieldDeletedDefinition_UnknownIdThrows()
    {
        // With validation, an unknown ID now throws CustomFieldUnknown
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Unknown CF",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = 9999, Label = "Inexistant", Value = "test" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldUnknown, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_TwoCustomFieldsSameLabel_DistinctKeys()
    {
        var cfd1 = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Surface", FieldType = FieldType.Number,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        var cfd2 = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Surface", FieldType = FieldType.Number,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.AddRange(cfd1, cfd2);
        await _db.SaveChangesAsync();

        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Dual Surface",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd1.Id, Label = "Surface", Value = 50 },
                new() { Id = cfd2.Id, Label = "Surface", Value = 75 }
            }
        });
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Dual Surface",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd1.Id, Label = "Surface", Value = 60 },
                new() { Id = cfd2.Id, Label = "Surface", Value = 80 }
            }
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", created.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.ContainsKey($"CustomFields:{cfd1.Id}:Surface") &&
                d.ContainsKey($"CustomFields:{cfd2.Id}:Surface"))),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_CustomFieldsNullToValue_LogsDiff()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Notes CF", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Null CF"
        });
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Null CF",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Notes CF", Value = "hello" }
            }
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", created.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.ContainsKey($"CustomFields:{cfd.Id}:Notes CF"))),
            Times.Once);
    }

    // --- CreateAsync / UpdateAsync: CustomFields validation ---

    [Fact]
    public async Task CreateAsync_CustomFieldRequiredAtCreation_Missing_ThrowsError()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Champ obligatoire", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.RequiredAtCreation, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Test"
                // CustomFields is null — required field missing
            }));
        Assert.Equal(ApiError.CustomFieldRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldRequiredAtCreation_EmptyValue_ThrowsError()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Champ obligatoire", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.RequiredAtCreation, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Test",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = cfd.Id, Label = "Champ obligatoire", Value = "" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldRequired, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldRequiredAtCreation_Present_Succeeds()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Champ obligatoire", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.RequiredAtCreation, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var result = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Champ obligatoire", Value = "Valeur renseignée" }
            }
        });

        Assert.NotEqual(0, result.Id);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldUnknownId_ThrowsError()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Test",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = 9999, Label = "Inexistant", Value = "test" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldUnknown, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldNotApplicableToQuotes_ThrowsError()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Champ sites", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = false, AppliesToSites = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Test",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = cfd.Id, Label = "Champ sites", Value = "test" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldUnknown, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldNumberType_StringValue_ThrowsError()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Surface", FieldType = FieldType.Number,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Test",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = cfd.Id, Label = "Surface", Value = "abc" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldInvalidValue, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldNumberType_ValidNumber_Succeeds()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Surface", FieldType = FieldType.Number,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var result = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Surface", Value = 42 }
            }
        });

        Assert.NotEqual(0, result.Id);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldSingleChoice_InvalidOption_ThrowsError()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Type", FieldType = FieldType.SingleChoice,
            Options = "{\"choices\":[\"A\",\"B\",\"C\"]}", ObligationLevel = ObligationLevel.Never,
            AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Test",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = cfd.Id, Label = "Type", Value = "D" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldInvalidValue, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldSingleChoice_ValidOption_Succeeds()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Type", FieldType = FieldType.SingleChoice,
            Options = "{\"choices\":[\"A\",\"B\",\"C\"]}", ObligationLevel = ObligationLevel.Never,
            AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var result = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Type", Value = "B" }
            }
        });

        Assert.NotEqual(0, result.Id);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldMultipleChoice_InvalidOption_ThrowsError()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Prestations", FieldType = FieldType.MultipleChoice,
            Options = "{\"choices\":[\"X\",\"Y\",\"Z\"]}", ObligationLevel = ObligationLevel.Never,
            AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Test",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = cfd.Id, Label = "Prestations", Value = "[\"X\",\"W\"]" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldInvalidValue, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldMultipleChoice_AllValid_Succeeds()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Prestations", FieldType = FieldType.MultipleChoice,
            Options = "{\"choices\":[\"X\",\"Y\",\"Z\"]}", ObligationLevel = ObligationLevel.Never,
            AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var result = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Prestations", Value = "[\"X\",\"Z\"]" }
            }
        });

        Assert.NotEqual(0, result.Id);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldDate_InvalidFormat_ThrowsError()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Date début", FieldType = FieldType.Date,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.CreateAsync(new CreateQuoteRequest
            {
                CustomerId = _customerId, Subject = "Test",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = cfd.Id, Label = "Date début", Value = "pas-une-date" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldInvalidValue, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldDate_ValidFormat_Succeeds()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Date début", FieldType = FieldType.Date,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var result = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Date début", Value = "2026-04-15" }
            }
        });

        Assert.NotEqual(0, result.Id);
    }

    [Fact]
    public async Task UpdateAsync_CustomFieldRequired_AlsoEnforced()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Obligatoire création", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.RequiredAtCreation, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Obligatoire création", Value = "Rempli" }
            }
        });

        // Update without the required field — should also throw (RequiredAtCreation enforced always)
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(created.Id, new UpdateQuoteRequest
            {
                Subject = "Test modifié"
            }));
        Assert.Equal(ApiError.CustomFieldRequired, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_CustomFieldInvalidType_StillThrows()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Surface", FieldType = FieldType.Number,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Surface", Value = 50 }
            }
        });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(created.Id, new UpdateQuoteRequest
            {
                Subject = "Test",
                CustomFields = new List<CustomFieldEntry>
                {
                    new() { Id = cfd.Id, Label = "Surface", Value = "abc" }
                }
            }));
        Assert.Equal(ApiError.CustomFieldInvalidValue, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_CustomFieldEnrichedLabel_UsesDefinitionLabel()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Surface totale", FieldType = FieldType.Number,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        var result = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId, Subject = "Test",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "nimportequoi", Value = 50 }
            }
        });

        // The stored data should use the definition label, not the one sent by the client
        var quote = await _db.Quotes.FirstAsync(q => q.Id == result.Id);
        Assert.Contains("Surface totale", quote.CustomFields!);
        Assert.DoesNotContain("nimportequoi", quote.CustomFields!);
    }

    // --- Retrocompatibility: old format custom fields ---

    [Fact]
    public async Task GetByIdAsync_OldFormatCustomFields_ReturnsEnrichedFormat()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Type de travaux", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        // Insert a quote with old format directly in DB
        var quote = new Quote
        {
            TenantId = _tenantId, CustomerId = _customerId, CreatedBy = _userId,
            Reference = "DEV-2026-OLD", Subject = "Old format",
            Status = QuoteStatus.Draft, Priority = QuotePriority.Normal,
            CustomFields = $"{{\"{cfd.Id}\": \"Renovation\"}}",
            CreatedAt = DateTime.UtcNow
        };
        _db.Quotes.Add(quote);
        await _db.SaveChangesAsync();

        var result = await _service.GetByIdAsync(quote.Id);

        Assert.NotNull(result);
        Assert.NotNull(result.CustomFields);
        Assert.Single(result.CustomFields);
        Assert.Equal(cfd.Id, result.CustomFields[0].Id);
        Assert.Equal("Type de travaux", result.CustomFields[0].Label);
    }

    [Fact]
    public async Task GetByIdAsync_OldFormatCustomFields_MissingDefinition_FallbackLabel()
    {
        // Insert a quote with old format pointing to a non-existent definition
        var quote = new Quote
        {
            TenantId = _tenantId, CustomerId = _customerId, CreatedBy = _userId,
            Reference = "DEV-2026-OLD2", Subject = "Missing def",
            Status = QuoteStatus.Draft, Priority = QuotePriority.Normal,
            CustomFields = "{\"999\": \"old value\"}",
            CreatedAt = DateTime.UtcNow
        };
        _db.Quotes.Add(quote);
        await _db.SaveChangesAsync();

        var result = await _service.GetByIdAsync(quote.Id);

        Assert.NotNull(result);
        Assert.NotNull(result.CustomFields);
        Assert.Single(result.CustomFields);
        Assert.Equal(999, result.CustomFields[0].Id);
        Assert.Equal("Field #999", result.CustomFields[0].Label);
    }

    [Fact]
    public async Task UpdateAsync_OldFormatInDb_DiffStillWorks()
    {
        var cfd = new CustomFieldDefinition
        {
            TenantId = _tenantId, Label = "Type de travaux", FieldType = FieldType.Text,
            ObligationLevel = ObligationLevel.Never, AppliesToQuotes = true, CreatedAt = DateTime.UtcNow
        };
        _db.CustomFieldDefinitions.Add(cfd);
        await _db.SaveChangesAsync();

        // Insert a quote with old format directly in DB
        var quote = new Quote
        {
            TenantId = _tenantId, CustomerId = _customerId, CreatedBy = _userId,
            Reference = "DEV-2026-OLD3", Subject = "Old to new",
            Status = QuoteStatus.Draft, Priority = QuotePriority.Normal,
            CustomFields = $"{{\"{cfd.Id}\": \"Renovation\"}}",
            CreatedAt = DateTime.UtcNow
        };
        _db.Quotes.Add(quote);
        await _db.SaveChangesAsync();
        _auditServiceMock.Reset();

        // Update with new format
        await _service.UpdateAsync(quote.Id, new UpdateQuoteRequest
        {
            Subject = "Old to new",
            CustomFields = new List<CustomFieldEntry>
            {
                new() { Id = cfd.Id, Label = "Type de travaux", Value = "Neuf" }
            }
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", quote.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.ContainsKey($"CustomFields:{cfd.Id}:Type de travaux"))),
            Times.Once);
    }

    // --- UpdateStatusAsync ---

    [Fact]
    public async Task UpdateStatusAsync_DraftToSent_Succeeds()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });

        var result = await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" });

        Assert.Equal("Sent", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_DraftToSent_LogsAuditStatusChanged()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });
        _auditServiceMock.Reset();

        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote",
            created.Id,
            AuditAction.StatusChanged,
            It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task UpdateStatusAsync_SentToAccepted_Succeeds()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" });

        var result = await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Accepted" });

        Assert.Equal("Accepted", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_SentToRefused_Succeeds()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" });

        var result = await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Refused" });

        Assert.Equal("Refused", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_DraftToAccepted_ThrowsQuoteInvalidTransition()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Accepted" }));
        Assert.Equal(ApiError.QuoteInvalidTransition, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_DraftToRefused_ThrowsQuoteInvalidTransition()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Refused" }));
        Assert.Equal(ApiError.QuoteInvalidTransition, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_AcceptedToDraft_ThrowsQuoteInvalidTransition()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Accepted" });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Draft" }));
        Assert.Equal(ApiError.QuoteInvalidTransition, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_AcceptedToSent_ThrowsQuoteInvalidTransition()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Accepted" });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" }));
        Assert.Equal(ApiError.QuoteInvalidTransition, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_RefusedToDraft_ThrowsQuoteInvalidTransition()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Refused" });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Draft" }));
        Assert.Equal(ApiError.QuoteInvalidTransition, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_RefusedToSent_ThrowsQuoteInvalidTransition()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" });
        await _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Refused" });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Sent" }));
        Assert.Equal(ApiError.QuoteInvalidTransition, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_NonExistingQuote_ThrowsQuoteNotFound()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(99999, new UpdateQuoteStatusRequest { Status = "Sent" }));
        Assert.Equal(ApiError.QuoteNotFound, ex.Code);
    }

    [Fact]
    public async Task UpdateStatusAsync_InvalidStatusString_ThrowsQuoteInvalidStatus()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test"
        });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateStatusAsync(created.Id, new UpdateQuoteStatusRequest { Status = "Invalid" }));
        Assert.Equal(ApiError.QuoteInvalidStatus, ex.Code);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ExistingQuote_ReturnsQuoteWithLines()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test GetById",
            Lines =
            [
                new QuoteLineRequest { Description = "Line 1", Quantity = 1, UnitPriceExclTax = 100m, DisplayOrder = 0 }
            ]
        });

        var result = await _service.GetByIdAsync(created.Id);

        Assert.NotNull(result);
        Assert.Equal("Test GetById", result.Subject);
        Assert.Single(result.Lines);
        Assert.Equal("Line 1", result.Lines[0].Description);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistingId_ReturnsNull()
    {
        var result = await _service.GetByIdAsync(99999);

        Assert.Null(result);
    }

    // --- GetAllAsync ---

    [Fact]
    public async Task GetAllAsync_ReturnsPaginatedListOrderedByDateDesc()
    {
        await _service.CreateAsync(new CreateQuoteRequest { CustomerId = _customerId, Subject = "First" });
        await _service.CreateAsync(new CreateQuoteRequest { CustomerId = _customerId, Subject = "Second" });
        await _service.CreateAsync(new CreateQuoteRequest { CustomerId = _customerId, Subject = "Third" });

        var result = await _service.GetAllAsync(1, 2);

        Assert.Equal(2, result.Data.Count);
        Assert.Equal(3, result.Pagination.TotalItems);
        Assert.Equal(2, result.Pagination.TotalPages);
        Assert.Equal(1, result.Pagination.Page);
        // Most recent first
        Assert.Equal("Third", result.Data[0].Subject);
        Assert.Equal("Second", result.Data[1].Subject);
    }

    [Fact]
    public async Task GetAllAsync_TenantIsolation_DoesNotReturnOtherTenantQuotes()
    {
        await _service.CreateAsync(new CreateQuoteRequest { CustomerId = _customerId, Subject = "My quote" });

        // Create another tenant with a quote (bypass query filter via raw SQL)
        var otherTenant = new Tenant { Name = "Other Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        await _db.SaveChangesAsync();

        // Create customer for other tenant
        _db.Database.ExecuteSqlRaw(
            "INSERT INTO customers (tenant_id, last_name, first_name, created_at) VALUES ({0}, 'Other', 'Customer', datetime('now'))",
            otherTenant.Id);

        var otherCustomer = await _db.Customers.IgnoreQueryFilters()
            .FirstAsync(c => c.TenantId == otherTenant.Id);

        _db.Database.ExecuteSqlRaw(
            "INSERT INTO quotes (tenant_id, customer_id, created_by, reference, subject, status, priority, created_at) VALUES ({0}, {1}, {2}, 'DEV-2026-999', 'Other quote', 'Draft', 'Normal', datetime('now'))",
            otherTenant.Id, otherCustomer.Id, _userId);

        var result = await _service.GetAllAsync();

        Assert.Single(result.Data);
        Assert.Equal("My quote", result.Data[0].Subject);
    }

    // --- GenerateReference ---

    [Fact]
    public async Task GenerateReference_FirstQuote_ReturnsDEV_Year_001()
    {
        var result = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "First"
        });

        var year = DateTime.UtcNow.Year;
        Assert.Equal($"DEV-{year}-001", result.Reference);
    }

    [Fact]
    public async Task GenerateReference_SecondQuote_ReturnsDEV_Year_002()
    {
        await _service.CreateAsync(new CreateQuoteRequest { CustomerId = _customerId, Subject = "First" });

        var result = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Second"
        });

        var year = DateTime.UtcNow.Year;
        Assert.Equal($"DEV-{year}-002", result.Reference);
    }

    [Fact]
    public async Task GenerateReference_UniquePerTenant_TwoTenantsCanHaveSameSequence()
    {
        // Current tenant gets DEV-YEAR-001
        var result1 = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Tenant 1 quote"
        });

        var year = DateTime.UtcNow.Year;
        Assert.Equal($"DEV-{year}-001", result1.Reference);

        // Create another tenant
        var otherTenant = new Tenant { Name = "Other Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        await _db.SaveChangesAsync();

        // Create customer for other tenant (bypass query filter)
        _db.Database.ExecuteSqlRaw(
            "INSERT INTO customers (tenant_id, last_name, first_name, created_at) VALUES ({0}, 'Other', 'Customer', datetime('now'))",
            otherTenant.Id);

        // Insert a quote for other tenant with same reference format
        _db.Database.ExecuteSqlRaw(
            "INSERT INTO quotes (tenant_id, customer_id, created_by, reference, subject, status, priority, created_at) VALUES ({0}, (SELECT id FROM customers WHERE tenant_id = {0} LIMIT 1), {1}, 'DEV-{2}-001', 'Other tenant quote', 'Draft', 'Normal', datetime('now'))",
            otherTenant.Id, _userId, year);

        // Current tenant's second quote should be DEV-YEAR-002 (not 003)
        var result2 = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Tenant 1 second quote"
        });

        Assert.Equal($"DEV-{year}-002", result2.Reference);
    }

    // --- SearchAsync ---

    private async Task SeedSearchDataAsync()
    {
        var customer2 = new Customer
        {
            TenantId = _tenantId,
            LastName = "Lefevre",
            FirstName = "Marie",
            CreatedAt = DateTime.UtcNow
        };
        _db.Customers.Add(customer2);
        await _db.SaveChangesAsync();

        var quotes = new[]
        {
            new Quote
            {
                TenantId = _tenantId, CustomerId = _customerId, CreatedBy = _userId,
                Reference = "DEV-2026-001", Subject = "Rénovation toiture",
                Status = QuoteStatus.Draft, Priority = QuotePriority.High,
                Notes = "Urgence avant hiver", CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new Quote
            {
                TenantId = _tenantId, CustomerId = _customerId, CreatedBy = _userId,
                Reference = "DEV-2026-002", Subject = "Isolation combles",
                Status = QuoteStatus.Sent, Priority = QuotePriority.Normal,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new Quote
            {
                TenantId = _tenantId, CustomerId = customer2.Id, CreatedBy = _userId,
                Reference = "DEV-2026-003", Subject = "Peinture toiture garage",
                Status = QuoteStatus.Accepted, Priority = QuotePriority.Low,
                Notes = "Client fidele", CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
        };
        _db.Quotes.AddRange(quotes);
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task SearchAsync_BySubject_ReturnsMatchingQuotes()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("toiture");

        Assert.Equal(2, results.Count);
        Assert.All(results, r => Assert.Contains("toiture", r.Subject, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task SearchAsync_ByReference_ReturnsMatchingQuote()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("DEV-2026-001");

        Assert.Single(results);
        Assert.Equal("DEV-2026-001", results[0].Reference);
    }

    [Fact]
    public async Task SearchAsync_ByCustomerName_ReturnsMatchingQuotes()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("Lefevre");

        Assert.Single(results);
        Assert.Equal("Lefevre Marie", results[0].CustomerName);
    }

    [Fact]
    public async Task SearchAsync_ByNotes_ReturnsMatchingQuotes()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("Urgence");

        Assert.Single(results);
        Assert.Equal("DEV-2026-001", results[0].Reference);
    }

    [Fact]
    public async Task SearchAsync_ShortQuery_ReturnsEmptyList()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("a");

        Assert.Empty(results);
    }

    [Fact]
    public async Task SearchAsync_EmptyQuery_ReturnsEmptyList()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("");

        Assert.Empty(results);
    }

    [Fact]
    public async Task SearchAsync_NullQuery_ReturnsEmptyList()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync(null!);

        Assert.Empty(results);
    }

    [Fact]
    public async Task SearchAsync_LimitRespected_ReturnsMaxResults()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("DEV-2026", limit: 2);

        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task SearchAsync_OrderedByCreatedAtDesc()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("DEV-2026");

        Assert.Equal(3, results.Count);
        Assert.Equal("DEV-2026-003", results[0].Reference); // Most recent
        Assert.Equal("DEV-2026-002", results[1].Reference);
        Assert.Equal("DEV-2026-001", results[2].Reference); // Oldest
    }

    [Fact]
    public async Task SearchAsync_ReturnsCorrectFields()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("DEV-2026-003");

        Assert.Single(results);
        var r = results[0];
        Assert.True(r.Id > 0);
        Assert.Equal("DEV-2026-003", r.Reference);
        Assert.False(string.IsNullOrEmpty(r.Subject));
        Assert.False(string.IsNullOrEmpty(r.Status));
        Assert.False(string.IsNullOrEmpty(r.Priority));
        Assert.False(string.IsNullOrEmpty(r.CustomerName));
        Assert.NotEqual(default, r.CreatedAt);
    }

    [Fact]
    public async Task SearchAsync_ByFirstNameOnly_ReturnsMatchingQuotes()
    {
        await SeedSearchDataAsync();

        var results = await _service.SearchAsync("Marie");

        Assert.Single(results);
        Assert.Equal("Lefevre Marie", results[0].CustomerName);
    }

    [Fact]
    public async Task SearchAsync_TenantIsolation_DoesNotReturnOtherTenantQuotes()
    {
        await SeedSearchDataAsync();

        // Create another tenant with a quote matching "toiture" via raw SQL to bypass global filter
        var otherTenant = new Tenant { Name = "Other Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        await _db.SaveChangesAsync();

        var otherUser = new User
        {
            TenantId = otherTenant.Id, Email = "other@test.fr", PasswordHash = "hash",
            FirstName = "Other", LastName = "User", Role = UserRole.Chef, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(otherUser);
        await _db.SaveChangesAsync();

        var otherCustomer = new Customer
        {
            TenantId = otherTenant.Id, LastName = "OtherClient", FirstName = "Test", CreatedAt = DateTime.UtcNow
        };
        _db.Customers.Add(otherCustomer);
        await _db.SaveChangesAsync();

        _db.Database.ExecuteSqlRaw(
            "INSERT INTO quotes (tenant_id, customer_id, created_by, reference, subject, status, priority, created_at) " +
            "VALUES ({0}, {1}, {2}, 'OTH-001', 'Toiture other tenant', 0, 0, datetime('now'))",
            otherTenant.Id, otherCustomer.Id, otherUser.Id);

        var results = await _service.SearchAsync("toiture");

        // Should only return current tenant's quotes, not the other tenant's
        Assert.All(results, r => Assert.DoesNotContain("other", r.Subject, StringComparison.OrdinalIgnoreCase));
        Assert.Equal(2, results.Count);
    }

    // --- UpdateAsync: Lines by Id (add/update/delete) ---

    private async Task<QuoteResponse> CreateQuoteWithLinesAsync(params (string desc, decimal qty, decimal price)[] lines)
    {
        return await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = lines.Select((l, i) => new QuoteLineRequest
            {
                Description = l.desc, Quantity = l.qty, UnitPriceExclTax = l.price, DisplayOrder = i
            }).ToList()
        });
    }

    [Fact]
    public async Task UpdateAsync_WithLineId_UpdatesExistingLine()
    {
        var created = await CreateQuoteWithLinesAsync(("Pose carrelage", 10, 50m));
        var lineId = created.Lines[0].Id;
        _auditServiceMock.Reset();

        var result = await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = [new QuoteLineRequest { Id = lineId, Description = "Pose carrelage", Quantity = 15, UnitPriceExclTax = 50m, DisplayOrder = 0 }]
        });

        Assert.Single(result.Lines);
        Assert.Equal(lineId, result.Lines[0].Id); // Same Id, not recreated
        Assert.Equal(15, result.Lines[0].Quantity);
    }

    [Fact]
    public async Task UpdateAsync_WithoutLineId_CreatesNewLine()
    {
        var created = await CreateQuoteWithLinesAsync(("Existing", 1, 100m));
        var existingLineId = created.Lines[0].Id;
        _auditServiceMock.Reset();

        var result = await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines =
            [
                new QuoteLineRequest { Id = existingLineId, Description = "Existing", Quantity = 1, UnitPriceExclTax = 100m, DisplayOrder = 0 },
                new QuoteLineRequest { Description = "New line", Quantity = 2, UnitPriceExclTax = 75m, DisplayOrder = 1 }
            ]
        });

        Assert.Equal(2, result.Lines.Count);
        Assert.Equal(existingLineId, result.Lines[0].Id);
        Assert.NotEqual(existingLineId, result.Lines[1].Id); // New Id
        Assert.Equal("New line", result.Lines[1].Description);
    }

    [Fact]
    public async Task UpdateAsync_MissingLineId_DeletesLine()
    {
        var created = await CreateQuoteWithLinesAsync(("Line A", 1, 100m), ("Line B", 2, 50m));
        var lineAId = created.Lines[0].Id;
        _auditServiceMock.Reset();

        var result = await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = [new QuoteLineRequest { Id = lineAId, Description = "Line A", Quantity = 1, UnitPriceExclTax = 100m, DisplayOrder = 0 }]
        });

        Assert.Single(result.Lines);
        Assert.Equal(lineAId, result.Lines[0].Id);
    }

    [Fact]
    public async Task UpdateAsync_NullLines_DeletesAllLines()
    {
        var created = await CreateQuoteWithLinesAsync(("Line", 1, 100m));
        _auditServiceMock.Reset();

        var result = await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = null
        });

        Assert.Empty(result.Lines);
        Assert.Null(result.AmountExclTax);
        Assert.Null(result.AmountInclTax);
    }

    [Fact]
    public async Task UpdateAsync_EmptyLines_DeletesAllLines()
    {
        var created = await CreateQuoteWithLinesAsync(("Line", 1, 100m));
        _auditServiceMock.Reset();

        var result = await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = []
        });

        Assert.Empty(result.Lines);
        Assert.Null(result.AmountExclTax);
    }

    [Fact]
    public async Task UpdateAsync_InvalidLineId_ThrowsQuoteLineNotFound()
    {
        var created = await CreateQuoteWithLinesAsync(("Line", 1, 100m));

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(created.Id, new UpdateQuoteRequest
            {
                Subject = "Test lignes",
                Lines = [new QuoteLineRequest { Id = 99999, Description = "X", Quantity = 1, UnitPriceExclTax = 1m, DisplayOrder = 0 }]
            }));
        Assert.Equal(ApiError.QuoteLineNotFound, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_LineIdZero_ThrowsQuoteLineNotFound()
    {
        var created = await CreateQuoteWithLinesAsync(("Line", 1, 100m));

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(created.Id, new UpdateQuoteRequest
            {
                Subject = "Test lignes",
                Lines = [new QuoteLineRequest { Id = 0, Description = "X", Quantity = 1, UnitPriceExclTax = 1m, DisplayOrder = 0 }]
            }));
        Assert.Equal(ApiError.QuoteLineNotFound, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_DuplicateLineId_ThrowsQuoteLineDuplicateId()
    {
        var created = await CreateQuoteWithLinesAsync(("Line", 1, 100m));
        var lineId = created.Lines[0].Id;

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _service.UpdateAsync(created.Id, new UpdateQuoteRequest
            {
                Subject = "Test lignes",
                Lines =
                [
                    new QuoteLineRequest { Id = lineId, Description = "A", Quantity = 1, UnitPriceExclTax = 1m, DisplayOrder = 0 },
                    new QuoteLineRequest { Id = lineId, Description = "B", Quantity = 2, UnitPriceExclTax = 2m, DisplayOrder = 1 }
                ]
            }));
        Assert.Equal(ApiError.QuoteLineDuplicateId, ex.Code);
    }

    [Fact]
    public async Task UpdateAsync_MixedLines_AddsUpdatesAndDeletes()
    {
        var created = await CreateQuoteWithLinesAsync(
            ("Keep", 1, 100m),
            ("Modify", 2, 50m),
            ("Delete", 3, 30m)
        );
        var keepId = created.Lines[0].Id;
        var modifyId = created.Lines[1].Id;
        _auditServiceMock.Reset();

        var result = await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines =
            [
                new QuoteLineRequest { Id = keepId, Description = "Keep", Quantity = 1, UnitPriceExclTax = 100m, DisplayOrder = 0 },
                new QuoteLineRequest { Id = modifyId, Description = "Modify", Quantity = 5, UnitPriceExclTax = 50m, DisplayOrder = 1 },
                new QuoteLineRequest { Description = "New", Quantity = 10, UnitPriceExclTax = 25m, DisplayOrder = 2 }
            ]
        });

        Assert.Equal(3, result.Lines.Count);
        Assert.Equal(keepId, result.Lines[0].Id);
        Assert.Equal(modifyId, result.Lines[1].Id);
        Assert.Equal(5, result.Lines[1].Quantity); // Modified
        Assert.Equal("New", result.Lines[2].Description);
        // Totals: 1*100 + 5*50 + 10*25 = 100+250+250 = 600 HT, 720 TTC
        Assert.Equal(600m, result.AmountExclTax);
        Assert.Equal(720m, result.AmountInclTax);
    }

    // --- UpdateAsync: Granular line audit ---

    [Fact]
    public async Task UpdateAsync_LineModified_LogsGranularDiffWithLineDescription()
    {
        var created = await CreateQuoteWithLinesAsync(("Pose carrelage", 10, 50m));
        var lineId = created.Lines[0].Id;
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = [new QuoteLineRequest { Id = lineId, Description = "Pose carrelage", Quantity = 15, UnitPriceExclTax = 50m, DisplayOrder = 0 }]
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", created.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.ContainsKey($"Lines:Modified:{lineId}:Quantity"))),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_LineAdded_LogsAddedWithSnapshot()
    {
        var created = await CreateQuoteWithLinesAsync(("Existing", 1, 100m));
        var existingId = created.Lines[0].Id;
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines =
            [
                new QuoteLineRequest { Id = existingId, Description = "Existing", Quantity = 1, UnitPriceExclTax = 100m, DisplayOrder = 0 },
                new QuoteLineRequest { Description = "New line", Quantity = 3, UnitPriceExclTax = 40m, DisplayOrder = 1 }
            ]
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", created.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.Keys.Any(k => k.StartsWith("Lines:Added:")))),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_LineRemoved_LogsRemovedWithSnapshot()
    {
        var created = await CreateQuoteWithLinesAsync(("To remove", 5, 200m));
        var lineId = created.Lines[0].Id;
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = []
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", created.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.ContainsKey($"Lines:Removed:{lineId}"))),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_LineDescriptionChanged_LogsModifiedDescription()
    {
        var created = await CreateQuoteWithLinesAsync(("Old desc", 1, 100m));
        var lineId = created.Lines[0].Id;
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = [new QuoteLineRequest { Id = lineId, Description = "New desc", Quantity = 1, UnitPriceExclTax = 100m, DisplayOrder = 0 }]
        });

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote", created.Id, AuditAction.Updated,
            It.Is<Dictionary<string, object?>>(d =>
                d.ContainsKey($"Lines:Modified:{lineId}:Description"))),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_NoLineChanges_NoLineAuditEntries()
    {
        var created = await CreateQuoteWithLinesAsync(("Same", 1, 100m));
        var lineId = created.Lines[0].Id;
        _auditServiceMock.Reset();

        await _service.UpdateAsync(created.Id, new UpdateQuoteRequest
        {
            Subject = "Test lignes",
            TaxRate = 20m,
            Lines = [new QuoteLineRequest { Id = lineId, Description = "Same", Quantity = 1, UnitPriceExclTax = 100m, DisplayOrder = 0 }]
        });

        // No audit event at all since nothing changed
        _auditServiceMock.Verify(a => a.LogEventAsync(
            It.IsAny<string>(), It.IsAny<int>(), AuditAction.Updated,
            It.IsAny<object>()), Times.Never);
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_ExistingQuote_ShouldRemoveFromDb()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "À supprimer",
            TaxRate = 20m
        });

        await _service.DeleteAsync(created.Id);

        var result = await _service.GetByIdAsync(created.Id);
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_NotFound_ShouldThrow()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.DeleteAsync(9999));
        Assert.Equal(ApiError.QuoteNotFound, ex.Code);
    }

    [Fact]
    public async Task DeleteAsync_WithLinkedSite_ShouldThrow()
    {
        // Create an accepted quote
        var quote = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "Devis avec chantier",
            TaxRate = 20m
        });
        await _service.UpdateStatusAsync(quote.Id, new UpdateQuoteStatusRequest { Status = "Sent" });
        await _service.UpdateStatusAsync(quote.Id, new UpdateQuoteStatusRequest { Status = "Accepted" });

        // Create a site linked to the quote
        var site = new Site
        {
            TenantId = _tenantId,
            CustomerId = _customerId,
            CreatedBy = _userId,
            QuoteId = quote.Id,
            Reference = "CH-2026-001",
            Subject = "Chantier lié",
            SiteAddress = "1 rue Test",
            Status = SiteStatus.Planned,
            CreatedAt = DateTime.UtcNow
        };
        _db.Sites.Add(site);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() => _service.DeleteAsync(quote.Id));
        Assert.Equal(ApiError.QuoteHasLinkedSite, ex.Code);
    }

    [Fact]
    public async Task DeleteAsync_ShouldLogAuditEvent()
    {
        var created = await _service.CreateAsync(new CreateQuoteRequest
        {
            CustomerId = _customerId,
            Subject = "À supprimer audit",
            TaxRate = 20m
        });
        _auditServiceMock.Reset();

        await _service.DeleteAsync(created.Id);

        _auditServiceMock.Verify(a => a.LogEventAsync(
            "Quote",
            created.Id,
            AuditAction.Deleted,
            null
        ), Times.Once);
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
