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

    public CustomFieldService(AppDbContext db, ITenantContext tenantContext, ILogger<CustomFieldService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<List<CustomFieldResponse>> GetAllAsync(bool? appliesToQuotes = null, bool? appliesToSites = null)
    {
        var query = _db.CustomFieldDefinitions.AsQueryable();

        if (appliesToQuotes == true)
            query = query.Where(f => f.AppliesToQuotes);

        if (appliesToSites == true)
            query = query.Where(f => f.AppliesToSites);

        var fields = await query.OrderBy(f => f.DisplayOrder).ToListAsync();
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
        if (string.IsNullOrWhiteSpace(request.Label))
            throw new ApiErrorException(ApiError.InvalidLabel);

        if (request.Label.Length > 255)
            throw new ApiErrorException(ApiError.InvalidLabel);

        if (!request.AppliesToQuotes && !request.AppliesToSites)
            throw new ApiErrorException(ApiError.AppliesToRequired);

        if (!Enum.TryParse<FieldType>(request.FieldType, ignoreCase: true, out var fieldType))
            throw new ApiErrorException(ApiError.InvalidFieldType);

        if (!Enum.TryParse<ObligationLevel>(request.ObligationLevel, ignoreCase: true, out var obligationLevel))
            throw new ApiErrorException(ApiError.InvalidObligationLevel);

        ValidateOptions(request.Options, fieldType);

        var maxOrder = await _db.CustomFieldDefinitions
            .Select(f => (int?)f.DisplayOrder)
            .MaxAsync() ?? -1;

        var field = new CustomFieldDefinition
        {
            TenantId = _tenantContext.TenantId,
            Label = request.Label.Trim(),
            FieldType = fieldType,
            Options = request.Options,
            ObligationLevel = obligationLevel,
            AppliesToQuotes = request.AppliesToQuotes,
            AppliesToSites = request.AppliesToSites,
            DisplayOrder = maxOrder + 1,
            CreatedAt = DateTime.UtcNow
        };

        _db.CustomFieldDefinitions.Add(field);
        await _db.SaveChangesAsync();

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

        if (request.Label != null)
        {
            if (string.IsNullOrWhiteSpace(request.Label) || request.Label.Length > 255)
                throw new ApiErrorException(ApiError.InvalidLabel);
            field.Label = request.Label.Trim();
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

        if (request.AppliesToQuotes.HasValue)
            field.AppliesToQuotes = request.AppliesToQuotes.Value;

        if (request.AppliesToSites.HasValue)
            field.AppliesToSites = request.AppliesToSites.Value;

        if (!field.AppliesToQuotes && !field.AppliesToSites)
            throw new ApiErrorException(ApiError.AppliesToRequired);

        field.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("CustomField updated: {FieldId} for tenant {TenantId}", field.Id, _tenantContext.TenantId);

        return MapToResponse(field);
    }

    public async Task DeleteAsync(int id)
    {
        var field = await _db.CustomFieldDefinitions.FirstOrDefaultAsync(f => f.Id == id);
        if (field == null)
            throw new ApiErrorException(ApiError.CustomFieldNotFound);

        _db.CustomFieldDefinitions.Remove(field);
        await _db.SaveChangesAsync();

        _logger.LogInformation("CustomField deleted: {FieldId} for tenant {TenantId}", id, _tenantContext.TenantId);
    }

    public async Task<List<CustomFieldResponse>> ReorderAsync(ReorderCustomFieldsRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        var allFields = await _db.CustomFieldDefinitions.ToListAsync();

        if (request.FieldIds.Distinct().Count() != request.FieldIds.Count)
            throw new ApiErrorException(ApiError.InvalidReorderList);

        if (request.FieldIds.Count != allFields.Count ||
            !request.FieldIds.All(id => allFields.Any(f => f.Id == id)))
        {
            throw new ApiErrorException(ApiError.InvalidReorderList);
        }

        for (var i = 0; i < request.FieldIds.Count; i++)
        {
            var field = allFields.First(f => f.Id == request.FieldIds[i]);
            field.DisplayOrder = i;
        }

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        _logger.LogInformation("CustomFields reordered for tenant {TenantId}", _tenantContext.TenantId);

        return await GetAllAsync();
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
            DisplayOrder = field.DisplayOrder,
            CreatedAt = field.CreatedAt,
            UpdatedAt = field.UpdatedAt
        };
    }
}
