using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
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

    private static readonly Dictionary<SiteStatus, SiteStatus[]> AllowedTransitions = new()
    {
        { SiteStatus.Planned, [SiteStatus.InProgress] },
        { SiteStatus.InProgress, [SiteStatus.Paused, SiteStatus.Completed] },
        { SiteStatus.Paused, [SiteStatus.InProgress, SiteStatus.Completed] },
        { SiteStatus.Completed, [] },
    };

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

    public async Task DeleteAsync(int id)
    {
        var site = await _db.Sites.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new ApiErrorException(ApiError.SiteNotFound);

        _db.Sites.Remove(site);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("Site", site.Id, AuditAction.Deleted);
        _logger.LogInformation("Site {SiteId} deleted for tenant {TenantId}", site.Id, _tenantContext.TenantId);
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

    public async Task<PaginatedResponse<SiteResponse>> GetAllAsync(int page = 1, int pageSize = 20,
        string? status = null, string? search = null, string? sortBy = null, string? sortDirection = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Sites
            .Include(s => s.Customer)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Quote)
            .AsNoTracking()
            .AsQueryable();

        // Filter by status
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<SiteStatus>(status, ignoreCase: true, out var parsedStatus))
            query = query.Where(s => s.Status == parsedStatus);

        // Search
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(s =>
                s.Customer.LastName.Contains(term) ||
                s.Customer.FirstName.Contains(term) ||
                s.Subject.Contains(term) ||
                s.Reference.Contains(term) ||
                s.SiteAddress.Contains(term));
        }

        // Sorting — default CreatedAt desc (newest first)
        var isAsc = string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);
        query = (sortBy?.ToLowerInvariant()) switch
        {
            "reference" => isAsc ? query.OrderBy(s => s.Reference) : query.OrderByDescending(s => s.Reference),
            "subject" => isAsc ? query.OrderBy(s => s.Subject) : query.OrderByDescending(s => s.Subject),
            "status" => isAsc ? query.OrderBy(s => s.Status) : query.OrderByDescending(s => s.Status),
            "customername" => isAsc
                ? query.OrderBy(s => s.Customer.LastName).ThenBy(s => s.Customer.FirstName)
                : query.OrderByDescending(s => s.Customer.LastName).ThenByDescending(s => s.Customer.FirstName),
            _ => isAsc ? query.OrderBy(s => s.CreatedAt) : query.OrderByDescending(s => s.CreatedAt),
        };

        var totalItems = await query.CountAsync();

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResponse<SiteResponse>
        {
            Data = items.Select(s => MapToResponse(s)).ToList(),
            Pagination = new PaginationInfo
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling((double)totalItems / pageSize)
            }
        };
    }

    public async Task<SiteResponse> UpdateStatusAsync(int id, string newStatus)
    {
        var site = await _db.Sites
            .Include(s => s.Customer)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Quote)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (site == null)
            throw new ApiErrorException(ApiError.SiteNotFound);

        if (!Enum.TryParse<SiteStatus>(newStatus, ignoreCase: true, out var status))
            throw new ApiErrorException(ApiError.SiteInvalidStatusTransition);

        var oldStatus = site.Status;
        ValidateTransition(oldStatus, status);

        site.Status = status;
        site.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("Site", id, AuditAction.StatusChanged,
            new { Old = oldStatus.ToString(), New = status.ToString() });

        _logger.LogInformation("Site {SiteId} status changed {Old} → {New}", id, oldStatus, status);

        return MapToResponse(site);
    }

    public async Task<SiteResponse> UpdateAsync(int id, UpdateSiteRequest request)
    {
        var site = await _db.Sites
            .Include(s => s.Customer)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Quote)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (site == null)
            throw new ApiErrorException(ApiError.SiteNotFound);

        // Capture old values for audit diff
        var oldSubject = site.Subject;
        var oldAddress = site.SiteAddress;
        var oldStartDate = site.StartDate;
        var oldEndDate = site.EndDate;
        var oldNotes = site.Notes;
        var oldCustomFields = site.CustomFields;

        // Validate
        if (string.IsNullOrWhiteSpace(request.Subject))
            throw new ApiErrorException(ApiError.SiteSubjectRequired);

        if (request.Subject.Length > 500)
            throw new ApiErrorException(ApiError.SiteSubjectTooLong);

        if (string.IsNullOrWhiteSpace(request.SiteAddress))
            throw new ApiErrorException(ApiError.SiteAddressRequired);

        if (request.SiteAddress.Length > 1000)
            throw new ApiErrorException(ApiError.SiteAddressTooLong);

        if (request.Notes?.Length > 5000)
            throw new ApiErrorException(ApiError.SiteNotesTooLong);

        var startDate = ServiceHelpers.ParseDateOnly(request.StartDate);
        var endDate = ServiceHelpers.ParseDateOnly(request.EndDate);
        if (startDate.HasValue && endDate.HasValue && endDate < startDate)
            throw new ApiErrorException(ApiError.SiteEndDateBeforeStartDate);

        // Mutate
        site.Subject = request.Subject.Trim();
        site.SiteAddress = request.SiteAddress.Trim();
        site.StartDate = startDate;
        site.EndDate = endDate;
        site.Notes = ServiceHelpers.NullIfEmpty(request.Notes);
        site.CustomFields = await ValidateAndEnrichCustomFieldsAsync(request.CustomFields);

        site.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Build audit diff
        var changes = new Dictionary<string, object?>();
        if (site.Subject != oldSubject) changes[nameof(site.Subject)] = new { Old = oldSubject, New = site.Subject };
        if (site.SiteAddress != oldAddress) changes[nameof(site.SiteAddress)] = new { Old = oldAddress, New = site.SiteAddress };
        if (site.StartDate != oldStartDate) changes[nameof(site.StartDate)] = new { Old = oldStartDate?.ToString(), New = site.StartDate?.ToString() };
        if (site.EndDate != oldEndDate) changes[nameof(site.EndDate)] = new { Old = oldEndDate?.ToString(), New = site.EndDate?.ToString() };
        if (site.Notes != oldNotes) changes[nameof(site.Notes)] = new { Old = oldNotes, New = site.Notes };
        if (site.CustomFields != oldCustomFields)
        {
            var defLabels = await _db.CustomFieldDefinitions
                .ToDictionaryAsync(f => f.Id, f => f.Label);

            var oldEntries = NormalizeCustomFieldsForDiff(oldCustomFields, defLabels);
            var newEntries = NormalizeCustomFieldsForDiff(site.CustomFields, defLabels);
            var allIds = oldEntries.Keys.Union(newEntries.Keys).ToHashSet();

            foreach (var fieldId in allIds)
            {
                oldEntries.TryGetValue(fieldId, out var oldEntry);
                newEntries.TryGetValue(fieldId, out var newEntry);

                if (oldEntry.RawValue == newEntry.RawValue) continue;

                var label = newEntry.Label ?? oldEntry.Label ?? $"Field #{fieldId}";
                changes[$"CustomFields:{fieldId}:{label}"] = new { Old = oldEntry.RawValue, New = newEntry.RawValue };
            }
        }

        if (changes.Count > 0)
            await _auditService.LogEventAsync("Site", id, AuditAction.Updated, changes);

        _logger.LogInformation("Site {SiteId} updated for tenant {TenantId}", id, _tenantContext.TenantId);

        return MapToResponse(site);
    }

    private static Dictionary<int, (string? Label, string? RawValue)> NormalizeCustomFieldsForDiff(
        string? json, Dictionary<int, string> defLabels)
    {
        var result = new Dictionary<int, (string? Label, string? RawValue)>();
        if (string.IsNullOrWhiteSpace(json)) return result;

        try
        {
            var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
            if (dict == null) return result;

            foreach (var kvp in dict)
            {
                int fieldId;
                string? label;

                if (kvp.Key.StartsWith("CustomFields:"))
                {
                    var afterPrefix = kvp.Key["CustomFields:".Length..];
                    var colonIdx = afterPrefix.IndexOf(':');
                    if (colonIdx < 0 || !int.TryParse(afterPrefix[..colonIdx], out fieldId)) continue;
                    label = afterPrefix[(colonIdx + 1)..];
                }
                else if (int.TryParse(kvp.Key, out fieldId))
                {
                    label = defLabels.TryGetValue(fieldId, out var l) ? l : null;
                }
                else continue;

                var rawValue = kvp.Value.ValueKind == JsonValueKind.Null ? null : kvp.Value.GetRawText();
                result[fieldId] = (label, rawValue);
            }
        }
        catch { /* malformed JSON — treat as empty */ }

        return result;
    }

    private static void ValidateTransition(SiteStatus current, SiteStatus target)
    {
        if (!AllowedTransitions.TryGetValue(current, out var allowed) || !allowed.Contains(target))
            throw new ApiErrorException(ApiError.SiteInvalidStatusTransition);
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
