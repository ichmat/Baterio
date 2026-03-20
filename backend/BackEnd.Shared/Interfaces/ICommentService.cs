using BackEnd.Shared.Models.Comments;
using BackEnd.Shared.Models.Common;

namespace BackEnd.Shared.Interfaces;

public interface ICommentService
{
    Task<CommentResponse> AddAsync(string entityType, int entityId, CreateCommentRequest request);
    Task<PaginatedResponse<CommentResponse>> GetAsync(string entityType, int entityId, int page = 1, int pageSize = 50);
    Task DeleteAsync(int id);
}
