using System.Security.Claims;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Comments;
using BackEnd.Shared.Models.Common;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class CommentService : ICommentService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _auditService;
    private readonly ITenantContext _tenantContext;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CommentService(AppDbContext db, IAuditService auditService,
        ITenantContext tenantContext, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _auditService = auditService;
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<CommentResponse> AddAsync(string entityType, int entityId, CreateCommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            throw new ApiErrorException(ApiError.CommentContentRequired);

        var trimmed = request.Content.Trim();

        if (trimmed.Length > 2000)
            throw new ApiErrorException(ApiError.CommentContentTooLong);

        // Verify entity type is supported
        if (entityType != "Quote")
            throw new ApiErrorException(ApiError.CommentEntityTypeNotSupported);

        // Verify target entity exists
        var entityExists = await _db.Quotes.AnyAsync(q => q.Id == entityId);

        if (!entityExists)
            throw new ApiErrorException(ApiError.QuoteNotFound);

        var userIdClaim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : 0;

        var comment = new Comment
        {
            TenantId = _tenantContext.TenantId,
            EntityType = entityType,
            EntityId = entityId,
            UserId = userId,
            Content = trimmed,
            CreatedAt = DateTime.UtcNow
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync(entityType, entityId, AuditAction.CommentAdded,
            new { content = trimmed });

        // Load user for response
        var user = await _db.Users.FindAsync(userId);

        return new CommentResponse
        {
            Id = comment.Id,
            EntityType = comment.EntityType,
            EntityId = comment.EntityId,
            UserId = comment.UserId,
            UserFullName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : "",
            Content = comment.Content,
            CreatedAt = comment.CreatedAt
        };
    }

    public async Task<PaginatedResponse<CommentResponse>> GetAsync(string entityType, int entityId, int page = 1, int pageSize = 50)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);

        var baseQuery = _db.Comments
            .Where(c => c.EntityType == entityType && c.EntityId == entityId);

        var totalItems = await baseQuery.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

        // page=0 → last page (convenience for frontend); page<0 → treated as page 1
        if (page == 0)
            page = Math.Max(1, totalPages);
        else
            page = Math.Max(1, page);

        var comments = await baseQuery
            .OrderBy(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CommentResponse
            {
                Id = c.Id,
                EntityType = c.EntityType,
                EntityId = c.EntityId,
                UserId = c.UserId,
                UserFullName = ((c.User.FirstName ?? "") + " " + (c.User.LastName ?? "")).Trim(),
                Content = c.Content,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return new PaginatedResponse<CommentResponse>
        {
            Data = comments,
            Pagination = new PaginationInfo
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            }
        };
    }

    public async Task DeleteAsync(int id)
    {
        var comment = await _db.Comments.FindAsync(id);
        if (comment == null)
            throw new ApiErrorException(ApiError.CommentNotFound);

        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync(comment.EntityType, comment.EntityId, AuditAction.Deleted,
            new { content = comment.Content });
    }
}
