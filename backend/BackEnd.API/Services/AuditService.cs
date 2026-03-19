using System.Security.Claims;
using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Audit;
using BackEnd.Shared.Models.Common;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AuditService> _logger;

    public AuditService(AppDbContext db, ITenantContext tenantContext,
        IHttpContextAccessor httpContextAccessor, ILogger<AuditService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task LogEventAsync(string entityType, int entityId, AuditAction action, object? payload = null)
    {
        var userIdClaim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : 0;

        var auditEvent = new AuditEvent
        {
            EntityType = entityType,
            EntityId = entityId,
            TenantId = _tenantContext.TenantId,
            UserId = userId,
            Action = action,
            Payload = payload != null ? JsonSerializer.Serialize(payload) : null,
            CreatedAt = DateTime.UtcNow
        };

        _db.AuditEvents.Add(auditEvent);
        await _db.SaveChangesAsync();

        _logger.LogDebug("Audit: {Action} on {EntityType}#{EntityId} by user {UserId}",
            action, entityType, entityId, userId);
    }

    public async Task<PaginatedResponse<AuditEventResponse>> GetEventsAsync(string entityType, int entityId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var baseQuery = _db.AuditEvents
            .Where(e => e.EntityType == entityType && e.EntityId == entityId);

        var totalItems = await baseQuery.CountAsync();

        var events = await baseQuery
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new AuditEventResponse
            {
                Id = e.Id,
                EntityType = e.EntityType,
                EntityId = e.EntityId,
                UserId = e.UserId,
                UserFullName = ((e.User.FirstName ?? "") + " " + (e.User.LastName ?? "")).Trim(),
                Action = e.Action.ToString(),
                Payload = e.Payload,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();

        return new PaginatedResponse<AuditEventResponse>
        {
            Data = events,
            Pagination = new PaginationInfo
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling((double)totalItems / pageSize)
            }
        };
    }
}
