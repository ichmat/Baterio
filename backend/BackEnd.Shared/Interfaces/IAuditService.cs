using BackEnd.Shared.Enums;
using BackEnd.Shared.Models.Audit;
using BackEnd.Shared.Models.Common;

namespace BackEnd.Shared.Interfaces;

public interface IAuditService
{
    Task LogEventAsync(string entityType, int entityId, AuditAction action, object? payload = null);
    Task<PaginatedResponse<AuditEventResponse>> GetEventsAsync(string entityType, int entityId, int page = 1, int pageSize = 20, string? action = null);
}
