using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.CustomFields;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class CustomFieldService : ICustomFieldService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CustomFieldService> _logger;
    private readonly IAuditService _auditService;

    public CustomFieldService(AppDbContext db, ITenantContext tenantContext, ILogger<CustomFieldService> logger, IAuditService auditService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
        _auditService = auditService;
    }

    public async Task<List<CustomFieldResponse>> GetAllAsync(bool? appliesToQuotes = null, bool? appliesToSites = null)
    {
        var query = _db.CustomFieldDefinitions.AsQueryable();

        if (appliesToQuotes == true)
            query = query.Where(f => f.AppliesToQuotes);

        if (appliesToSites == true)
            query = query.Where(f => f.AppliesToSites);

        if (appliesToSites == true && appliesToQuotes != true)
            query = query.OrderBy(f => f.DisplayOrderSites);
        else
            query = query.OrderBy(f => f.DisplayOrderQuotes);

        var fields = await query.ToListAsync();
        return fields.Select(MapToResponse).ToList();
    }

    public async Task<CustomFieldResponse> GetByIdAsync(int id)
    {
        var field = await _db.CustomFieldDefinitions.FirstOrDefaultAsync(f => f.Id == id);
        if (field == null)
            throw new ApiErrorException(ApiError.CustomFieldNotFound);

        return MapToResponse(field);
    }

    public async Task<CustomFieldResponse> CreateAsync(CreateCustomFieldRequest request)
    {
        var trimmedLabel = request.Label?.Trim();

        if (string.IsNullOrEmpty(trimmedLabel))
            throw new ApiErrorException(ApiError.InvalidLabel);

        if (trimmedLabel.Length > 255)
            throw new ApiErrorException(ApiError.InvalidLabel);

        if (trimmedLabel.Contains(':'))
            throw new ApiErrorException(ApiError.InvalidLabelCharacter);

        if (!request.AppliesToQuotes && !request.AppliesToSites)
            throw new ApiErrorException(ApiError.AppliesToRequired);

        if (!Enum.TryParse<FieldType>(request.FieldType, ignoreCase: true, out var fieldType))
            throw new ApiErrorException(ApiError.InvalidFieldType);

        if (!Enum.TryParse<ObligationLevel>(request.ObligationLevel, ignoreCase: true, out var obligationLevel))
            throw new ApiErrorException(ApiError.InvalidObligationLevel);

        ValidateOptions(request.Options, fieldType);

        int? displayOrderQuotes = null;
        int? displayOrderSites = null;

        if (request.AppliesToQuotes)
        {
            var maxOrder = await _db.CustomFieldDefinitions
                .Where(f => f.AppliesToQuotes)
                .Select(f => (int?)f.DisplayOrderQuotes)
                .MaxAsync() ?? -1;
            displayOrderQuotes = maxOrder + 1;
        }

        if (request.AppliesToSites)
        {
            var maxOrder = await _db.CustomFieldDefinitions
                .Where(f => f.AppliesToSites)
                .Select(f => (int?)f.DisplayOrderSites)
                .MaxAsync() ?? -1;
            displayOrderSites = maxOrder + 1;
        }

        var field = new CustomFieldDefinition
        {
            TenantId = _tenantContext.TenantId,
            Label = trimmedLabel,
            FieldType = fieldType,
            Options = request.Options,
            ObligationLevel = obligationLevel,
            AppliesToQuotes = request.AppliesToQuotes,
            AppliesToSites = request.AppliesToSites,
            DisplayOrderQuotes = displayOrderQuotes,
            DisplayOrderSites = displayOrderSites,
            CreatedAt = DateTime.UtcNow
        };

        _db.CustomFieldDefinitions.Add(field);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("CustomFieldDefinition", field.Id, AuditAction.Created,
            new { field.Label, FieldType = field.FieldType.ToString(), field.Options, ObligationLevel = field.ObligationLevel.ToString(), field.AppliesToQuotes, field.AppliesToSites });

        _logger.LogInformation("CustomField created: {FieldId} for tenant {TenantId}", field.Id, _tenantContext.TenantId);

        return MapToResponse(field);
    }

    public async Task<CustomFieldResponse> UpdateAsync(int id, UpdateCustomFieldRequest request)
    {
        var field = await _db.CustomFieldDefinitions.FirstOrDefaultAsync(f => f.Id == id);
        if (field == null)
            throw new ApiErrorException(ApiError.CustomFieldNotFound);

        if (request.FieldType != null)
            throw new ApiErrorException(ApiError.FieldTypeNotModifiable);

        var oldLabel = field.Label;
        var oldOptions = field.Options;
        var oldObligationLevel = field.ObligationLevel;

        if (request.Label != null)
        {
            var trimmed = request.Label.Trim();
            if (string.IsNullOrEmpty(trimmed) || trimmed.Length > 255)
                throw new ApiErrorException(ApiError.InvalidLabel);
            if (trimmed.Contains(':'))
                throw new ApiErrorException(ApiError.InvalidLabelCharacter);
            field.Label = trimmed;
        }

        if (request.Options != null)
        {
            ValidateOptions(request.Options, field.FieldType);
            field.Options = request.Options;
        }

        if (request.ObligationLevel != null)
        {
            if (!Enum.TryParse<ObligationLevel>(request.ObligationLevel, ignoreCase: true, out var obligationLevel))
                throw new ApiErrorException(ApiError.InvalidObligationLevel);
            field.ObligationLevel = obligationLevel;
        }

        var oldAppliesToQuotes = field.AppliesToQuotes;
        var oldAppliesToSites = field.AppliesToSites;

        if (request.AppliesToQuotes.HasValue)
            field.AppliesToQuotes = request.AppliesToQuotes.Value;

        if (request.AppliesToSites.HasValue)
            field.AppliesToSites = request.AppliesToSites.Value;

        if (!field.AppliesToQuotes && !field.AppliesToSites)
            throw new ApiErrorException(ApiError.AppliesToRequired);

        // Assign display order when a field is newly added to a context
        if (field.AppliesToQuotes && !oldAppliesToQuotes)
        {
            var maxOrder = await _db.CustomFieldDefinitions
                .Where(f => f.AppliesToQuotes && f.Id != field.Id)
                .Select(f => (int?)f.DisplayOrderQuotes)
                .MaxAsync() ?? -1;
            field.DisplayOrderQuotes = maxOrder + 1;
        }
        else if (!field.AppliesToQuotes && oldAppliesToQuotes)
        {
            field.DisplayOrderQuotes = null;
        }

        if (field.AppliesToSites && !oldAppliesToSites)
        {
            var maxOrder = await _db.CustomFieldDefinitions
                .Where(f => f.AppliesToSites && f.Id != field.Id)
                .Select(f => (int?)f.DisplayOrderSites)
                .MaxAsync() ?? -1;
            field.DisplayOrderSites = maxOrder + 1;
        }
        else if (!field.AppliesToSites && oldAppliesToSites)
        {
            field.DisplayOrderSites = null;
        }

        field.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var changes = new Dictionary<string, object?>();
        if (request.Label != null && request.Label.Trim() != oldLabel) changes["Label"] = new { Old = oldLabel, New = field.Label };
        if (request.Options != null && request.Options != oldOptions) changes["Options"] = new { Old = oldOptions, New = field.Options };
        if (request.ObligationLevel != null && field.ObligationLevel != oldObligationLevel) changes["ObligationLevel"] = new { Old = oldObligationLevel.ToString(), New = field.ObligationLevel.ToString() };
        if (request.AppliesToQuotes.HasValue && request.AppliesToQuotes.Value != oldAppliesToQuotes) changes["AppliesToQuotes"] = new { Old = oldAppliesToQuotes, New = field.AppliesToQuotes };
        if (request.AppliesToSites.HasValue && request.AppliesToSites.Value != oldAppliesToSites) changes["AppliesToSites"] = new { Old = oldAppliesToSites, New = field.AppliesToSites };

        await _auditService.LogEventAsync("CustomFieldDefinition", field.Id, AuditAction.Updated, changes);

        _logger.LogInformation("CustomField updated: {FieldId} for tenant {TenantId}", field.Id, _tenantContext.TenantId);

        return MapToResponse(field);
    }

    public async Task DeleteAsync(int id)
    {
        var field = await _db.CustomFieldDefinitions.FirstOrDefaultAsync(f => f.Id == id);
        if (field == null)
            throw new ApiErrorException(ApiError.CustomFieldNotFound);

        var deletedLabel = field.Label;
        _db.CustomFieldDefinitions.Remove(field);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("CustomFieldDefinition", id, AuditAction.Deleted,
            new { Label = deletedLabel });

        _logger.LogInformation("CustomField deleted: {FieldId} for tenant {TenantId}", id, _tenantContext.TenantId);
    }

    public async Task<List<CustomFieldResponse>> ReorderAsync(ReorderCustomFieldsRequest request)
    {
        var context = request.Context?.ToLowerInvariant();
        if (context != "quotes" && context != "sites")
            throw new ApiErrorException(ApiError.InvalidReorderContext);

        var contextFields = context == "quotes"
            ? await _db.CustomFieldDefinitions.Where(f => f.AppliesToQuotes).ToListAsync()
            : await _db.CustomFieldDefinitions.Where(f => f.AppliesToSites).ToListAsync();

        if (request.FieldIds.Distinct().Count() != request.FieldIds.Count)
            throw new ApiErrorException(ApiError.InvalidReorderList);

        if (request.FieldIds.Count != contextFields.Count ||
            !request.FieldIds.All(id => contextFields.Any(f => f.Id == id)))
        {
            throw new ApiErrorException(ApiError.InvalidReorderList);
        }

        for (var i = 0; i < request.FieldIds.Count; i++)
        {
            var field = contextFields.First(f => f.Id == request.FieldIds[i]);
            if (context == "quotes")
                field.DisplayOrderQuotes = i;
            else
                field.DisplayOrderSites = i;
        }

        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("CustomFieldDefinition", 0, AuditAction.Updated,
            new { Action = "Reorder", Context = context, FieldIds = request.FieldIds });

        _logger.LogInformation("CustomFields reordered ({Context}) for tenant {TenantId}", context, _tenantContext.TenantId);

        return await GetAllAsync();
    }

    internal static void ValidateValueOption(string? value, string? options, FieldType fieldType, bool mandatory)
    {
        if (fieldType is not FieldType.SingleChoice and not FieldType.MultipleChoice)
            return;

        if (string.IsNullOrWhiteSpace(value))
        {
            if(mandatory)
                throw new ApiErrorException(ApiError.CustomFieldRequired);
            return;
        }

        if (string.IsNullOrWhiteSpace(options))
            throw new ApiErrorException(ApiError.CustomFieldInvalidValue);

        HashSet<string> validChoices;
        try
        {
            using var doc = JsonDocument.Parse(options);
            var choices = doc.RootElement.GetProperty("choices");
            validChoices = choices.EnumerateArray()
                .Select(c => c.GetString()!)
                .ToHashSet();
        }
        catch 
        {
            throw new Exception($"Récupération des choix impossible pour {options}");
        }

        switch (fieldType)
        {
            case FieldType.SingleChoice:
                if (!validChoices.Contains(value))
                    throw new ApiErrorException(ApiError.CustomFieldInvalidValue);
                break;

            case FieldType.MultipleChoice:
                List<string> selectedValues;
                try
                {
                    using var doc = JsonDocument.Parse(value);
                    if (doc.RootElement.ValueKind != JsonValueKind.Array)
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue);

                    selectedValues = doc.RootElement.EnumerateArray()
                        .Select(e => e.GetString())
                        .ToList()!;
                }
                catch
                {
                    throw new ApiErrorException(ApiError.CustomFieldInvalidValue);
                }

                if(selectedValues.Count == 0 && mandatory)
                    throw new ApiErrorException(ApiError.CustomFieldRequired);

                foreach (var selected in selectedValues)
                {
                    if (selected is null || !validChoices.Contains(selected))
                        throw new ApiErrorException(ApiError.CustomFieldInvalidValue);
                }
                break;
        }
    }

    private static void ValidateOptions(string? options, FieldType fieldType)
    {
        var isChoiceType = fieldType == FieldType.SingleChoice || fieldType == FieldType.MultipleChoice;

        if (!isChoiceType)
        {
            if (!string.IsNullOrWhiteSpace(options))
                throw new ApiErrorException(ApiError.InvalidFieldType);
            return;
        }

        if (string.IsNullOrWhiteSpace(options))
            throw new ApiErrorException(ApiError.InvalidFieldType);

        try
        {
            using var doc = JsonDocument.Parse(options);
            if (!doc.RootElement.TryGetProperty("choices", out var choices) ||
                choices.ValueKind != JsonValueKind.Array ||
                choices.GetArrayLength() == 0)
            {
                throw new ApiErrorException(ApiError.InvalidFieldType);
            }

            foreach (var choice in choices.EnumerateArray())
            {
                if (choice.ValueKind != JsonValueKind.String ||
                    string.IsNullOrWhiteSpace(choice.GetString()))
                {
                    throw new ApiErrorException(ApiError.InvalidFieldType);
                }
            }
        }
        catch (JsonException)
        {
            throw new ApiErrorException(ApiError.InvalidFieldType);
        }
    }

    private static CustomFieldResponse MapToResponse(CustomFieldDefinition field)
    {
        return new CustomFieldResponse
        {
            Id = field.Id,
            Label = field.Label,
            FieldType = field.FieldType,
            Options = field.Options,
            ObligationLevel = field.ObligationLevel,
            AppliesToQuotes = field.AppliesToQuotes,
            AppliesToSites = field.AppliesToSites,
            DisplayOrderQuotes = field.DisplayOrderQuotes,
            DisplayOrderSites = field.DisplayOrderSites,
            CreatedAt = field.CreatedAt,
            UpdatedAt = field.UpdatedAt
        };
    }
}
