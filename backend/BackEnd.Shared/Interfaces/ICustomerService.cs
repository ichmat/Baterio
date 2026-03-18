using BackEnd.Shared.Models.Customers;

namespace BackEnd.Shared.Interfaces;

public interface ICustomerService
{
    Task<List<CustomerResponse>> GetAllAsync();
    Task<CustomerResponse?> GetByIdAsync(int id);
    Task<CustomerResponse> CreateAsync(CreateCustomerRequest request);
    Task<CustomerResponse> UpdateAsync(int id, UpdateCustomerRequest request);
    Task<List<CustomerSearchResult>> SearchAsync(string query, int limit = 10);
}
