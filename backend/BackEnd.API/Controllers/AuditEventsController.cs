using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Audit;
using BackEnd.Shared.Models.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/audit-events")]
[Authorize]
public class AuditEventsController : ControllerBase
{
    private readonly IAuditService _auditService;

    public AuditEventsController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetEvents([FromQuery] AuditEventQueryParams query)
    {
        if (string.IsNullOrWhiteSpace(query.EntityType))
            throw new ApiErrorException(ApiError.AuditEntityTypeRequired);

        if (!query.EntityId.HasValue)
            throw new ApiErrorException(ApiError.AuditEntityIdRequired);

        var result = await _auditService.GetEventsAsync(
            query.EntityType, query.EntityId.Value, query.Page, query.PageSize);

        return Ok(new ApiResponse<PaginatedResponse<AuditEventResponse>> { Data = result });
    }
}
