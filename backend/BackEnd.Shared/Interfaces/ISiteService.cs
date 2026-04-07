using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Planning;
using BackEnd.Shared.Models.Sites;

namespace BackEnd.Shared.Interfaces;

public interface ISiteService
{
    Task<List<SiteCalendarResponse>> GetCalendarSitesAsync(DateOnly start, DateOnly end);
    Task<SiteResponse?> GetByIdAsync(int id);
    Task<SiteResponse> CreateAsync(CreateSiteRequest request);
    Task<List<SiteSearchResult>> SearchAsync(string query, int limit = 10);
    Task<List<SiteSearchResult>> GetByCustomerAsync(int customerId);
    Task DeleteAsync(int id);
    Task<SiteResponse> UpdateStatusAsync(int id, string newStatus);
    Task<SiteResponse> UpdateAsync(int id, UpdateSiteRequest request);
    Task<PaginatedResponse<SiteResponse>> GetAllAsync(int page = 1, int pageSize = 20, string? status = null, string? search = null, string? sortBy = null, string? sortDirection = null);
}
