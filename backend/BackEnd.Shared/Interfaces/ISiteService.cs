using BackEnd.Shared.Models.Sites;

namespace BackEnd.Shared.Interfaces;

public interface ISiteService
{
    Task<SiteResponse?> GetByIdAsync(int id);
    Task<SiteResponse> CreateAsync(CreateSiteRequest request);
    Task<List<SiteSearchResult>> SearchAsync(string query, int limit = 10);
    Task<List<SiteSearchResult>> GetByCustomerAsync(int customerId);
    Task DeleteAsync(int id);
}
