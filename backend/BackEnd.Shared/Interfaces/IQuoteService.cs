using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Quotes;

namespace BackEnd.Shared.Interfaces;

public interface IQuoteService
{
    Task<PaginatedResponse<QuoteListResponse>> GetAllAsync(int page = 1, int pageSize = 20);
    Task<QuoteResponse?> GetByIdAsync(int id);
    Task<QuoteResponse> CreateAsync(CreateQuoteRequest request);
    Task<QuoteResponse> UpdateAsync(int id, UpdateQuoteRequest request);
    Task<QuoteResponse> UpdateStatusAsync(int id, UpdateQuoteStatusRequest request);
}
