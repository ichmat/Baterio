using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.CustomFields;
using BackEnd.Shared.Models.Sites;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BackEnd.API.Services;

public class SiteService : ISiteService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditService _auditService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<SiteService> _logger;

    public SiteService(AppDbContext db, ITenantContext tenantContext,
        IAuditService auditService, IHttpContextAccessor httpContextAccessor,
        ILogger<SiteService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditService = auditService;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<SiteResponse> CreateAsync(CreateSiteRequest request)
    {
        // 1. Validate CustomerId
        if (request.CustomerId <= 0)
            throw new ApiErrorException(ApiError.SiteCustomerRequired);

        // 2. Validate Subject
        if (string.IsNullOrWhiteSpace(request.Subject))
            throw new ApiErrorException(ApiError.SiteSubjectRequired);

        if (request.Subject.Length > 500)
            throw new ApiErrorException(ApiError.SiteSubjectTooLong);

        // 3. Validate SiteAddress
        if (string.IsNullOrWhiteSpace(request.SiteAddress))
            throw new ApiErrorException(ApiError.SiteAddressRequired);

        if (request.SiteAddress.Length > 1000)
            throw new ApiErrorException(ApiError.SiteAddressTooLong);

        // 3c. Validate Notes
        if (request.Notes?.Length > 5000)
            throw new ApiErrorException(ApiError.SiteNotesTooLong);

        // 3d. Validate dates
        var startDate = ServiceHelpers.ParseDateOnly(request.StartDate);
        var endDate = ServiceHelpers.ParseDateOnly(request.EndDate);
        if (startDate.HasValue && endDate.HasValue && endDate < startDate)
            throw new ApiErrorException(ApiError.SiteEndDateBeforeStartDate);

        // 4. Verify customer exists
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId);
        if (customer == null)
            throw new ApiErrorException(ApiError.SiteCustomerNotFound);

        // 5. If QuoteId provided, load and validate the quote
        if (request.QuoteId.HasValue)
        {
            var quote = await _db.Quotes.FirstOrDefaultAsync(q => q.Id == request.QuoteId.Value);
            if (quote == null)
                throw new ApiErrorException(ApiError.SiteQuoteNotFound);
            if (quote.Status != QuoteStatus.Accepted)
                throw new ApiErrorException(ApiError.SiteQuoteNotAccepted);
            if (quote.CustomerId != request.CustomerId)
                throw new ApiErrorException(ApiError.SiteCustomerNotFound);
        }

        // 6. Validate and enrich custom fields
        var customFieldsJson = await ValidateAndEnrichCustomFieldsAsync(request.CustomFields);

        // 7. Generate reference
        var reference = await GenerateReference();

        // 8. Get current user
        var userId = GetCurrentUserId();

        // 9. Create entity
        var site = new Site
        {
            TenantId = _tenantContext.TenantId,
            CustomerId = request.CustomerId,
            QuoteId = request.QuoteId,
            CreatedBy = userId,
            Reference = reference,
            Subject = request.Subject.Trim(),
            Status = SiteStatus.Planned,
            SiteAddress = request.SiteAddress.Trim(),
            StartDate = startDate,
            EndDate = endDate,
            CustomFields = customFieldsJson,
            Notes = ServiceHelpers.NullIfEmpty(request.Notes),
            CreatedAt = DateTime.UtcNow
        };

        _db.Sites.Add(site);
        await _db.SaveChangesAsync();

        // 10. Audit log
        await _auditService.LogEventAsync("Site", site.Id, AuditAction.Created,
            new { site.Reference, site.Subject, Status = site.Status.ToString(), CustomerName = $"{customer.LastName} {customer.FirstName}".Trim() });

        _logger.LogInformation("Site {SiteId} created for tenant {TenantId}", site.Id, _tenantContext.TenantId);

        // 11. Reload with navigations for response
        var created = await _db.Sites
            .Include(s => s.Customer)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Quote)
            .FirstAsync(s => s.Id == site.Id);

        return MapToResponse(created);
    }

    public async Task<SiteResponse?> GetByIdAsync(int id)
    {
        var site = await _db.Sites
            .Include(s => s.Customer)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Quote)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (site == null)
            return null;

        // Load definitions for old-format custom fields label resolution
        Dictionary<int, string>? labelLookup = null;
        if (!string.IsNullOrWhiteSpace(site.CustomFields))
        {
            labelLookup = await _db.CustomFieldDefinitions
                .ToDictionaryAsync(f => f.Id, f => f.Label);
        }

        return MapToResponse(site, labelLookup);
    }

    public async Task<List<SiteSearchResult>> SearchAsync(string query, int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            return [];

        var term = query.Trim();
        limit = Math.Clamp(limit, 1, 50);

        return await _db.Sites
            .AsNoTracking()
            .Where(s =>
                s.Subject.Contains(term) ||
                s.Reference.Contains(term) ||
                s.SiteAddress.Contains(term) ||
                s.Customer.LastName.Contains(term) ||
                s.Customer.FirstName.Contains(term))
            .OrderByDescending(s => s.CreatedAt)
            .Take(limit)
            .Select(s => new SiteSearchResult
            {
                Id = s.Id,
                Reference = s.Reference,
                Subject = s.Subject,
                Status = s.Status.ToString(),
                CustomerName = (s.Customer.LastName + " " + s.Customer.FirstName).Trim(),
                SiteAddress = s.SiteAddress,
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<List<SiteSearchResult>> GetByCustomerAsync(int customerId)
    {
        return await _db.Sites
            .AsNoTracking()
            .Where(s => s.CustomerId == customerId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SiteSearchResult
            {
                Id = s.Id,
                Reference = s.Reference,
                Subject = s.Subject,
                Status = s.Status.ToString(),
                CustomerName = (s.Customer.LastName + " " + s.Customer.FirstName).Trim(),
                SiteAddress = s.SiteAddress,
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    // --- Private helpers ---

    private async Task<string> GenerateReference()
    {
        var year = DateTime.UtcNow.Year;
        var tenant = await _db.Tenants.FirstAsync(t => t.Id == _tenantContext.TenantId);

        if (tenant.SiteRefYear != year)
        {
            tenant.SiteRefYear = year;
            tenant.SiteRefSequence = 1;
        }
        else
        {
            tenant.SiteRefSequence++;
        }

        // Tenant update is saved in the same SaveChanges as the Site (atomicity via TransactionMiddleware)
        return $"CH-{year}-{tenant.SiteRefSequence:000}";
    }

    private async Task<string?> ValidateAndEnrichCustomFieldsAsync(List<CustomFieldEntry>? entries)
    {
        CustomFieldDefinition[] customFields = await _db.CustomFieldDefinitions
            .Where(x => x.AppliesToSites == true)
            .ToArrayAsync();

        if (entries == null || entries.Count == 0)
        {
            var missingRequired = customFields.FirstOrDefault(f => f.ObligationLevel == ObligationLevel.RequiredForSiteConversion);
            if (missingRequired != null)
                throw new ApiErrorException(ApiError.SiteCustomFieldRequired, missingRequired.Label);
            return null;
        }

        Dictionary<string, object?> newJsonDictionnary = [];

        foreach (CustomFieldEntry fieldEntry in entries)
        {
            CustomFieldDefinition fieldDefinition = customFields.FirstOrDefault(x => x.Id == fieldEntry.Id)
                ?? throw new ApiErrorException(ApiError.CustomFieldUnknown, fieldEntry.Id, fieldEntry.Label);

            fieldEntry.Label = fieldDefinition.Label;

            bool mandatory = fieldDefinition.ObligationLevel == ObligationLevel.RequiredForSiteConversion;

            if (mandatory)
            {
                if (fieldEntry.Value == null)
                    throw new ApiErrorException(ApiError.SiteCustomFieldRequired, fieldDefinition.Label);
            }

            switch (fieldDefinition.FieldType)
            {
                case FieldType.Text:
                    if (!ServiceHelpers.IsElementString(fieldEntry.Value, out _))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas un texte");
                    if (mandatory && fieldEntry.Value is string && string.IsNullOrWhiteSpace(fieldEntry.Value.ToString()))
                        throw new ApiErrorException(ApiError.SiteCustomFieldRequired, fieldDefinition.Label);
                    break;
                case FieldType.Number:
                    if (!ServiceHelpers.IsElementNumber(fieldEntry.Value))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas un nombre");
                    break;
                case FieldType.SingleChoice:
                case FieldType.MultipleChoice:
                    if (!ServiceHelpers.IsElementString(fieldEntry.Value, out string optionValue))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas une option valide");
                    try
                    {
                        CustomFieldService.ValidateValueOption(optionValue, fieldDefinition.Options, fieldDefinition.FieldType, mandatory);
                    }
                    catch (ApiErrorException ex)
                    {
                        if (ex.Code == ApiError.CustomFieldInvalidValue)
                            throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas une option valide ou contient une option inconnu");
                        if (ex.Code == ApiError.CustomFieldRequired)
                            throw new ApiErrorException(ApiError.SiteCustomFieldRequired, fieldDefinition.Label);
                        throw;
                    }
                    break;
                case FieldType.Date:
                    if (fieldEntry.Value is null && mandatory)
                        throw new ApiErrorException(ApiError.SiteCustomFieldRequired, fieldDefinition.Label);
                    if (!ServiceHelpers.IsElementString(fieldEntry.Value, out string dateValue))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas une date");
                    if (!DateOnly.TryParse(dateValue, out _))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas une date");
                    break;
            }

            newJsonDictionnary.Add($"{nameof(Shared.Models.CustomFields)}:{fieldDefinition.Id}:{fieldDefinition.Label}", fieldEntry.Value);
        }

        // Check that all RequiredForSiteConversion fields are present in the entries list
        var submittedIds = entries.Select(e => e.Id).ToHashSet();
        var missingNotSubmitted = customFields.FirstOrDefault(f =>
            f.ObligationLevel == ObligationLevel.RequiredForSiteConversion && !submittedIds.Contains(f.Id));
        if (missingNotSubmitted != null)
            throw new ApiErrorException(ApiError.SiteCustomFieldRequired, missingNotSubmitted.Label);

        return JsonSerializer.Serialize(newJsonDictionnary);
    }

    private int GetCurrentUserId() => ServiceHelpers.GetCurrentUserId(_httpContextAccessor);

    private static SiteResponse MapToResponse(Site site, Dictionary<int, string>? labelLookup = null)
    {
        List<CustomFieldEntry>? customFieldEntries = null;

        if (!string.IsNullOrWhiteSpace(site.CustomFields))
        {
            var dict = ServiceHelpers.ParseCustomFieldsJson(site.CustomFields);
            var entries = new List<CustomFieldEntry>();

            foreach (var kvp in dict)
            {
                int fieldId;
                string label;

                if (kvp.Key.StartsWith("CustomFields:"))
                {
                    var afterPrefix = kvp.Key["CustomFields:".Length..];
                    var colonIdx = afterPrefix.IndexOf(':');
                    if (colonIdx < 0 || !int.TryParse(afterPrefix[..colonIdx], out fieldId)) continue;
                    label = afterPrefix[(colonIdx + 1)..];
                }
                else if (int.TryParse(kvp.Key, out fieldId))
                {
                    label = labelLookup?.TryGetValue(fieldId, out var l) == true ? l : $"Field #{fieldId}";
                }
                else continue;

                entries.Add(new CustomFieldEntry
                {
                    Id = fieldId,
                    Label = label,
                    Value = kvp.Value.ValueKind == JsonValueKind.Null ? null : kvp.Value
                });
            }

            if (entries.Count > 0) customFieldEntries = entries;
        }

        return new SiteResponse
        {
            Id = site.Id,
            Reference = site.Reference,
            Subject = site.Subject,
            Status = site.Status.ToString(),
            CustomerId = site.CustomerId,
            CustomerName = $"{site.Customer.LastName} {site.Customer.FirstName}".Trim(),
            QuoteId = site.QuoteId,
            QuoteReference = site.Quote?.Reference,
            SiteAddress = site.SiteAddress,
            StartDate = site.StartDate?.ToString("yyyy-MM-dd"),
            EndDate = site.EndDate?.ToString("yyyy-MM-dd"),
            CustomFields = customFieldEntries,
            Notes = site.Notes,
            CreatedBy = site.CreatedBy,
            CreatedByName = $"{site.CreatedByUser.LastName} {site.CreatedByUser.FirstName}".Trim(),
            CreatedAt = site.CreatedAt,
            UpdatedAt = site.UpdatedAt
        };
    }
}
