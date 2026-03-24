using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.CustomFields;
using BackEnd.Shared.Models.Quotes;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace BackEnd.API.Services;

public class QuoteService : IQuoteService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditService _auditService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<QuoteService> _logger;

    private static readonly Dictionary<QuoteStatus, QuoteStatus[]> AllowedTransitions = new()
    {
        { QuoteStatus.Draft, [QuoteStatus.Sent] },
        { QuoteStatus.Sent, [QuoteStatus.Accepted, QuoteStatus.Refused] },
        { QuoteStatus.Accepted, [] },
        { QuoteStatus.Refused, [] },
    };

    public QuoteService(AppDbContext db, ITenantContext tenantContext,
        IAuditService auditService, IHttpContextAccessor httpContextAccessor,
        ILogger<QuoteService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditService = auditService;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<QuoteResponse> CreateAsync(CreateQuoteRequest request)
    {
        if (request.CustomerId <= 0)
            throw new ApiErrorException(ApiError.QuoteCustomerRequired);

        if (string.IsNullOrWhiteSpace(request.Subject))
            throw new ApiErrorException(ApiError.QuoteSubjectRequired);

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId);
        if (customer == null)
            throw new ApiErrorException(ApiError.QuoteCustomerNotFound);

        if (!Enum.TryParse<QuotePriority>(request.Priority, ignoreCase: true, out var priority))
            throw new ApiErrorException(ApiError.QuoteInvalidPriority);

        var userId = GetCurrentUserId();
        var reference = await GenerateReference();
        var legalMentions = await GenerateLegalMentions();

        var quote = new Quote
        {
            TenantId = _tenantContext.TenantId,
            CustomerId = request.CustomerId,
            CreatedBy = userId,
            Reference = reference,
            Subject = request.Subject.Trim(),
            Status = QuoteStatus.Draft,
            Priority = priority,
            ValidityDate = ParseDateOnly(request.ValidityDate),
            EstimatedDuration = NullIfEmpty(request.EstimatedDuration),
            SiteAddress = NullIfEmpty(request.SiteAddress),
            TaxRate = request.TaxRate,
            ReminderDate = ParseDateOnly(request.ReminderDate),
            CustomFields = await ValidateAndEnrichCustomFieldsAsync(request.CustomFields),
            LegalMentions = legalMentions,
            Notes = NullIfEmpty(request.Notes),
            CreatedAt = DateTime.UtcNow
        };

        if (request.Lines is { Count: > 0 })
        {
            quote.Lines = request.Lines.Select(l => new QuoteLine
            {
                Description = l.Description,
                Quantity = l.Quantity,
                UnitPriceExclTax = l.UnitPriceExclTax,
                DisplayOrder = l.DisplayOrder,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        CalculateTotals(quote);

        _db.Quotes.Add(quote);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("Quote", quote.Id, AuditAction.Created,
            new { quote.Reference, quote.Subject, quote.Priority, quote.Status });

        _logger.LogInformation("Quote {QuoteId} created for tenant {TenantId}", quote.Id, _tenantContext.TenantId);

        // Reload with navigations for response mapping
        var created = await _db.Quotes
            .Include(q => q.Lines.OrderBy(l => l.DisplayOrder))
            .Include(q => q.Customer)
            .Include(q => q.CreatedByUser)
            .FirstAsync(q => q.Id == quote.Id);

        return MapToResponse(created);
    }

    public async Task<QuoteResponse> UpdateAsync(int id, UpdateQuoteRequest request)
    {
        var quote = await _db.Quotes
            .Include(q => q.Lines)
            .Include(q => q.Customer)
            .Include(q => q.CreatedByUser)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quote == null)
            throw new ApiErrorException(ApiError.QuoteNotFound);

        // Capture old values for audit diff
        var oldSubject = quote.Subject;
        var oldNotes = quote.Notes;
        var oldPriority = quote.Priority;
        var oldValidityDate = quote.ValidityDate;
        var oldEstimatedDuration = quote.EstimatedDuration;
        var oldSiteAddress = quote.SiteAddress;
        var oldCustomFields = quote.CustomFields;
        var oldTaxRate = quote.TaxRate;
        var oldReminderDate = quote.ReminderDate;
        var oldAmountExclTax = quote.AmountExclTax;
        var oldAmountInclTax = quote.AmountInclTax;

        if (string.IsNullOrWhiteSpace(request.Subject))
            throw new ApiErrorException(ApiError.QuoteSubjectRequired);

        quote.Subject = request.Subject.Trim();

        if (!Enum.TryParse<QuotePriority>(request.Priority, ignoreCase: true, out var priority))
            throw new ApiErrorException(ApiError.QuoteInvalidPriority);

        quote.Priority = priority;
        quote.Notes = NullIfEmpty(request.Notes);
        quote.ValidityDate = ParseDateOnly(request.ValidityDate);
        quote.EstimatedDuration = NullIfEmpty(request.EstimatedDuration);
        quote.SiteAddress = NullIfEmpty(request.SiteAddress);
        quote.CustomFields = await ValidateAndEnrichCustomFieldsAsync(request.CustomFields);
        quote.TaxRate = request.TaxRate;
        quote.ReminderDate = ParseDateOnly(request.ReminderDate);

        // Replace lines completely
        _db.QuoteLines.RemoveRange(quote.Lines);
        quote.Lines.Clear();

        if (request.Lines is { Count: > 0 })
        {
            quote.Lines = request.Lines.Select(l => new QuoteLine
            {
                Description = l.Description,
                Quantity = l.Quantity,
                UnitPriceExclTax = l.UnitPriceExclTax,
                DisplayOrder = l.DisplayOrder,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        CalculateTotals(quote);

        // Regenerate legal mentions
        quote.LegalMentions = await GenerateLegalMentions();

        quote.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Build audit diff
        var changes = new Dictionary<string, object?>();
        if (quote.Subject != oldSubject) changes[nameof(quote.Subject)] = new { Old = oldSubject, New = quote.Subject };
        if (quote.Notes != oldNotes) changes[nameof(quote.Notes)] = new { Old = oldNotes, New = quote.Notes };
        if (quote.Priority != oldPriority) changes[nameof(quote.Priority)] = new { Old = oldPriority.ToString(), New = quote.Priority.ToString() };
        if (quote.ValidityDate != oldValidityDate) changes[nameof(quote.ValidityDate)] = new { Old = oldValidityDate?.ToString(), New = quote.ValidityDate?.ToString() };
        if (quote.EstimatedDuration != oldEstimatedDuration) changes[nameof(quote.EstimatedDuration)] = new { Old = oldEstimatedDuration, New = quote.EstimatedDuration };
        if (quote.SiteAddress != oldSiteAddress) changes[nameof(quote.SiteAddress)] = new { Old = oldSiteAddress, New = quote.SiteAddress };
        if (quote.CustomFields != oldCustomFields)
        {
            var defLabels = await _db.CustomFieldDefinitions
                .ToDictionaryAsync(f => f.Id, f => f.Label);

            var oldEntries = NormalizeCustomFieldsForDiff(oldCustomFields, defLabels);
            var newEntries = NormalizeCustomFieldsForDiff(quote.CustomFields, defLabels);
            var allIds = oldEntries.Keys.Union(newEntries.Keys).ToHashSet();

            foreach (var fieldId in allIds)
            {
                oldEntries.TryGetValue(fieldId, out var oldEntry);
                newEntries.TryGetValue(fieldId, out var newEntry);

                if (oldEntry.RawValue == newEntry.RawValue) continue;

                var label = newEntry.Label ?? oldEntry.Label ?? $"Field #{fieldId}";
                changes[$"{nameof(quote.CustomFields)}:{fieldId}:{label}"] = new { Old = oldEntry.RawValue, New = newEntry.RawValue };
            }
        }
        if (quote.TaxRate != oldTaxRate) changes[nameof(quote.TaxRate)] = new { Old = oldTaxRate, New = quote.TaxRate };
        if (quote.ReminderDate != oldReminderDate) changes[nameof(quote.ReminderDate)] = new { Old = oldReminderDate?.ToString(), New = quote.ReminderDate?.ToString() };
        if (quote.AmountExclTax != oldAmountExclTax) changes[nameof(quote.AmountExclTax)] = new { Old = oldAmountExclTax, New = quote.AmountExclTax };
        if (quote.AmountInclTax != oldAmountInclTax) changes[nameof(quote.AmountInclTax)] = new { Old = oldAmountInclTax, New = quote.AmountInclTax };

        if (changes.Count > 0)
        {
            await _auditService.LogEventAsync(nameof(Quote), id, AuditAction.Updated, changes);
        }

        _logger.LogInformation("Quote {QuoteId} updated for tenant {TenantId}", id, _tenantContext.TenantId);

        // Reload to get ordered lines
        var updated = await _db.Quotes
            .Include(q => q.Lines.OrderBy(l => l.DisplayOrder))
            .Include(q => q.Customer)
            .Include(q => q.CreatedByUser)
            .FirstAsync(q => q.Id == id);

        return MapToResponse(updated);
    }

    public async Task<QuoteResponse> UpdateStatusAsync(int id, UpdateQuoteStatusRequest request)
    {
        var quote = await _db.Quotes
            .Include(q => q.Lines.OrderBy(l => l.DisplayOrder))
            .Include(q => q.Customer)
            .Include(q => q.CreatedByUser)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quote == null)
            throw new ApiErrorException(ApiError.QuoteNotFound);

        if (!Enum.TryParse<QuoteStatus>(request.Status, ignoreCase: true, out var newStatus))
            throw new ApiErrorException(ApiError.QuoteInvalidStatus);

        var oldStatus = quote.Status;
        ValidateTransition(oldStatus, newStatus);

        quote.Status = newStatus;
        quote.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("Quote", id, AuditAction.StatusChanged,
            new { Old = oldStatus.ToString(), New = newStatus.ToString() });

        _logger.LogInformation("Quote {QuoteId} status changed {Old} → {New}", id, oldStatus, newStatus);

        return MapToResponse(quote);
    }

    public async Task<QuoteResponse?> GetByIdAsync(int id)
    {
        var quote = await _db.Quotes
            .Include(q => q.Lines.OrderBy(l => l.DisplayOrder))
            .Include(q => q.Customer)
            .Include(q => q.CreatedByUser)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quote == null)
            return null;

        // Load definitions for old-format custom fields label resolution
        Dictionary<int, string>? labelLookup = null;
        if (!string.IsNullOrWhiteSpace(quote.CustomFields))
        {
            labelLookup = await _db.CustomFieldDefinitions
                .ToDictionaryAsync(f => f.Id, f => f.Label);
        }

        return MapToResponse(quote, labelLookup);
    }

    public async Task<PaginatedResponse<QuoteListResponse>> GetAllAsync(int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var baseQuery = _db.Quotes.AsQueryable();

        var totalItems = await baseQuery.CountAsync();

        var items = await baseQuery
            .OrderByDescending(q => q.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(q => new QuoteListResponse
            {
                Id = q.Id,
                Reference = q.Reference,
                Subject = q.Subject,
                Status = q.Status.ToString(),
                Priority = q.Priority.ToString(),
                CustomerName = (q.Customer.LastName + " " + q.Customer.FirstName).Trim(),
                AmountExclTax = q.AmountExclTax,
                AmountInclTax = q.AmountInclTax,
                ReminderDate = q.ReminderDate != null ? q.ReminderDate.Value.ToString("yyyy-MM-dd") : null,
                CreatedAt = q.CreatedAt
            })
            .ToListAsync();

        return new PaginatedResponse<QuoteListResponse>
        {
            Data = items,
            Pagination = new PaginationInfo
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling((double)totalItems / pageSize)
            }
        };
    }

    // --- Private helpers ---

    private static void ValidateTransition(QuoteStatus current, QuoteStatus target)
    {
        if (!AllowedTransitions.TryGetValue(current, out var allowed) || !allowed.Contains(target))
            throw new ApiErrorException(ApiError.QuoteInvalidTransition);
    }

    private async Task<string> GenerateReference()
    {
        var year = DateTime.UtcNow.Year;
        var tenant = await _db.Tenants.FirstAsync(t => t.Id == _tenantContext.TenantId);

        if (tenant.QuoteRefYear != year)
        {
            tenant.QuoteRefYear = year;
            tenant.QuoteRefSequence = 1;
        }
        else
        {
            tenant.QuoteRefSequence++;
        }

        // Tenant update is saved in the same SaveChanges as the Quote (atomicity via TransactionMiddleware)
        return $"DEV-{year}-{tenant.QuoteRefSequence:000}";
    }

    private async Task<string> GenerateLegalMentions()
    {
        var companyInfo = await _db.CompanyInfos.FirstOrDefaultAsync();

        if (companyInfo == null)
            return string.Empty;

        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(companyInfo.CompanyName))
            parts.Add(companyInfo.CompanyName);

        if (!string.IsNullOrWhiteSpace(companyInfo.LegalForm))
            parts.Add($"Forme juridique : {companyInfo.LegalForm}");

        if (!string.IsNullOrWhiteSpace(companyInfo.Siret))
            parts.Add($"SIRET : {companyInfo.Siret}");

        if (!string.IsNullOrWhiteSpace(companyInfo.VatNumber))
            parts.Add($"TVA : {companyInfo.VatNumber}");

        if (!string.IsNullOrWhiteSpace(companyInfo.InsuranceProvider) ||
            !string.IsNullOrWhiteSpace(companyInfo.InsuranceCoverage))
        {
            var insurance = "Garantie décennale";
            if (!string.IsNullOrWhiteSpace(companyInfo.InsuranceProvider))
                insurance += $" : {companyInfo.InsuranceProvider}";
            if (!string.IsNullOrWhiteSpace(companyInfo.InsurancePolicyNumber))
                insurance += $" (n° {companyInfo.InsurancePolicyNumber})";
            if (!string.IsNullOrWhiteSpace(companyInfo.InsuranceCoverage))
                insurance += $" — {companyInfo.InsuranceCoverage}";
            parts.Add(insurance);
        }

        if (!string.IsNullOrWhiteSpace(companyInfo.DefaultPaymentTerms))
            parts.Add($"Conditions de paiement : {companyInfo.DefaultPaymentTerms}");

        return string.Join("\n", parts);
    }

    private static void CalculateTotals(Quote quote)
    {
        if (quote.Lines.Count == 0)
        {
            quote.AmountExclTax = null;
            quote.AmountInclTax = null;
            return;
        }

        quote.AmountExclTax = Math.Round(quote.Lines.Sum(l => l.Quantity * l.UnitPriceExclTax), 2);

        if (quote.TaxRate.HasValue)
            quote.AmountInclTax = Math.Round(quote.AmountExclTax.Value * (1 + quote.TaxRate.Value / 100), 2);
        else
            quote.AmountInclTax = quote.AmountExclTax;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            throw new ApiErrorException(ApiError.Unauthorized);
        return int.Parse(userIdClaim.Value);
    }

    private static DateOnly? ParseDateOnly(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        return DateOnly.TryParse(value, out var date) ? date : null;
    }

    private static Dictionary<string, JsonElement> ParseCustomFieldsJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, JsonElement>();
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)
                   ?? new Dictionary<string, JsonElement>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, JsonElement>();
        }
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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
        catch (JsonException) { }

        return result;
    }

    private async Task<string?> ValidateAndEnrichCustomFieldsAsync(List<CustomFieldEntry>? entries)
    {
        CustomFieldDefinition[] customFields = await _db.CustomFieldDefinitions
            .Where(x => x.AppliesToQuotes == true)
            .ToArrayAsync();

        if (entries == null || entries.Count == 0)
        {
            var missingRequired = customFields.FirstOrDefault(f => f.ObligationLevel == ObligationLevel.RequiredAtCreation);
            if (missingRequired != null)
                throw new ApiErrorException(ApiError.CustomFieldRequired, missingRequired.Label);
            return null;
        }

        Dictionary<string, object?> newJsonDictionnary = [];

        foreach (CustomFieldEntry fieldEntry in entries)
        {
            CustomFieldDefinition fieldDefinition = customFields.FirstOrDefault(x => x.Id == fieldEntry.Id) 
                ?? throw new ApiErrorException(ApiError.CustomFieldUnknown, fieldEntry.Id, fieldEntry.Label);

            fieldEntry.Label = fieldDefinition.Label; // Ensure label is always up to date

            bool mandatory = fieldDefinition.ObligationLevel == ObligationLevel.RequiredAtCreation;

            if (mandatory)
            {
                if (fieldEntry.Value == null)
                    throw new ApiErrorException(ApiError.CustomFieldRequired, fieldDefinition.Label);
            }

            switch (fieldDefinition.FieldType)
            {
                case FieldType.Text:
                    if(!IsElementString(fieldEntry.Value, out _))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas un texte");
                    if (mandatory && fieldEntry.Value is string && string.IsNullOrWhiteSpace(fieldEntry.Value.ToString()))
                        throw new ApiErrorException(ApiError.CustomFieldRequired, fieldDefinition.Label);
                    break;
                case FieldType.Number:
                    if (!IsElementNumber(fieldEntry.Value))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas un nombre");
                    break;
                case FieldType.SingleChoice:
                case FieldType.MultipleChoice:
                    if (!IsElementString(fieldEntry.Value, out string optionValue))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas une option valide");
                    try
                    {
                        CustomFieldService.ValidateValueOption(optionValue, fieldDefinition.Options, fieldDefinition.FieldType, mandatory);
                    }
                    catch (ApiErrorException ex)
                    {
                        if(ex.Code == ApiError.CustomFieldInvalidValue)
                            throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas une option valide ou contient une option inconnu");
                        if(ex.Code == ApiError.CustomFieldRequired)
                            throw new ApiErrorException(ApiError.CustomFieldRequired, fieldDefinition.Label);
                        throw;
                    }
                    break;
                case FieldType.Date:
                    if(fieldEntry.Value is null && mandatory)
                        throw new ApiErrorException(ApiError.CustomFieldRequired, fieldDefinition.Label);
                    if (!IsElementString(fieldEntry.Value, out string dateValue))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas une date");
                    if (!DateOnly.TryParse(dateValue, out _))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue, fieldDefinition.Label, "La valeur n'est pas une date");
                    break;
            }

            newJsonDictionnary.Add($"{nameof(Shared.Models.CustomFields)}:{fieldDefinition.Id}:{fieldDefinition.Label}", fieldEntry.Value);
        }

        // Check that all RequiredAtCreation fields are present in the entries list
        var submittedIds = entries.Select(e => e.Id).ToHashSet();
        var missingNotSubmitted = customFields.FirstOrDefault(f =>
            f.ObligationLevel == ObligationLevel.RequiredAtCreation && !submittedIds.Contains(f.Id));
        if (missingNotSubmitted != null)
            throw new ApiErrorException(ApiError.CustomFieldRequired, missingNotSubmitted.Label);

        return JsonSerializer.Serialize(newJsonDictionnary);
    }

    private static bool IsElementString(object? element, out string value)
    {
        if(element is not null)
        {
            if(element is string s)
            {
                value = s;
                return true;
            }
            if(element is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.String)
            {
                value = jsonElement.GetString() ?? string.Empty;
                return true;
            }

            value = string.Empty;
            return false;
        }

        value = string.Empty;
        return true;
    }

    private static bool IsElementNumber(object? element)
    {
        if (element is decimal d)
        {
            return true;
        }
        if (element is int i)
        {
            return true;
        }
        if (element is float f)
        {
            return true;
        }
        if (element is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Number)
        {
            return true;
        }
        return false;
    }

    private static QuoteResponse MapToResponse(Quote quote, Dictionary<int, string>? labelLookup = null)
    {
        List<CustomFieldEntry>? customFieldEntries = null;

        if (!string.IsNullOrWhiteSpace(quote.CustomFields))
        {
            var dict = ParseCustomFieldsJson(quote.CustomFields);
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

        return new QuoteResponse
        {
            Id = quote.Id,
            Reference = quote.Reference,
            Subject = quote.Subject,
            Status = quote.Status.ToString(),
            Priority = quote.Priority.ToString(),
            CustomerId = quote.CustomerId,
            CustomerName = $"{quote.Customer.LastName} {quote.Customer.FirstName}".Trim(),
            ValidityDate = quote.ValidityDate?.ToString("yyyy-MM-dd"),
            EstimatedDuration = quote.EstimatedDuration,
            SiteAddress = quote.SiteAddress,
            AmountExclTax = quote.AmountExclTax,
            TaxRate = quote.TaxRate,
            AmountInclTax = quote.AmountInclTax,
            ReminderDate = quote.ReminderDate?.ToString("yyyy-MM-dd"),
            CustomFields = customFieldEntries,
            LegalMentions = quote.LegalMentions,
            Notes = quote.Notes,
            CreatedBy = quote.CreatedBy,
            CreatedByName = $"{quote.CreatedByUser.LastName} {quote.CreatedByUser.FirstName}".Trim(),
            CreatedAt = quote.CreatedAt,
            UpdatedAt = quote.UpdatedAt,
            Lines = quote.Lines.Select(l => new QuoteLineResponse
            {
                Id = l.Id,
                Description = l.Description,
                Quantity = l.Quantity,
                UnitPriceExclTax = l.UnitPriceExclTax,
                LineTotalExclTax = l.Quantity * l.UnitPriceExclTax,
                DisplayOrder = l.DisplayOrder
            }).ToList()
        };
    }
}
