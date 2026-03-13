using BackEnd.Shared.Models.CustomFields;

namespace BackEnd.Shared.Interfaces;

public interface ICustomFieldService
{
    Task<List<CustomFieldResponse>> GetAllAsync(bool? appliesToQuotes = null, bool? appliesToSites = null);
    Task<CustomFieldResponse> GetByIdAsync(int id);
    Task<CustomFieldResponse> CreateAsync(CreateCustomFieldRequest request);
    Task<CustomFieldResponse> UpdateAsync(int id, UpdateCustomFieldRequest request);
    Task DeleteAsync(int id);
    Task<List<CustomFieldResponse>> ReorderAsync(ReorderCustomFieldsRequest request);
}
