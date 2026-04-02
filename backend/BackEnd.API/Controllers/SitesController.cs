using BackEnd.API.Infrastructure;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Quotes;
using BackEnd.Shared.Models.SiteAssignments;
using BackEnd.Shared.Models.Sites;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/sites")]
[Authorize]
[RoleAuthorize(UserRole.Admin, UserRole.Chef, UserRole.Secretaire)]
public class SitesController : ControllerBase
{
    private readonly ISiteService _siteService;
    private readonly ISiteAssignmentService _assignmentService;

    public SitesController(ISiteService siteService, ISiteAssignmentService assignmentService)
    {
        _siteService = siteService;
        _assignmentService = assignmentService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSiteRequest request)
    {
        var result = await _siteService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, new ApiResponse<SiteResponse>(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _siteService.GetByIdAsync(id);
        if (result == null)
            throw new ApiErrorException(ApiError.SiteNotFound);
        return Ok(new ApiResponse<SiteResponse>(result));
    }

    [HttpGet("by-customer/{customerId}")]
    public async Task<IActionResult> GetByCustomer(int customerId)
    {
        var result = await _siteService.GetByCustomerAsync(customerId);
        return Ok(new ApiResponse<List<SiteSearchResult>>(result));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q = "", [FromQuery] int limit = 10)
    {
        if (q.Length > 200) q = q[..200];
        var result = await _siteService.SearchAsync(q, limit);
        return Ok(new ApiResponse<List<SiteSearchResult>>(result));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateQuoteStatusRequest request)
    {
        var result = await _siteService.UpdateStatusAsync(id, request.Status);
        return Ok(new ApiResponse<SiteResponse>(result));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSiteRequest request)
    {
        var result = await _siteService.UpdateAsync(id, request);
        return Ok(new ApiResponse<SiteResponse>(result));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null)
    {
        var result = await _siteService.GetAllAsync(page, pageSize, status, search, sortBy, sortDirection);
        return Ok(new ApiResponse<PaginatedResponse<SiteResponse>>(result));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _siteService.DeleteAsync(id);
        return NoContent();
    }

    // --- Site Assignments ---

    [HttpPost("{id}/assignments")]
    public async Task<IActionResult> CreateAssignment(int id, [FromBody] CreateAssignmentRequest request)
    {
        var result = await _assignmentService.CreateAsync(id, request);
        return Ok(new ApiResponse<List<SiteAssignmentResponse>>(result));
    }

    [HttpPost("{id}/assignments/batch")]
    public async Task<IActionResult> CreateBatchAssignment(int id, [FromBody] CreateBatchAssignmentRequest request)
    {
        var result = await _assignmentService.CreateBatchAsync(id, request);
        return Ok(new ApiResponse<List<SiteAssignmentResponse>>(result));
    }

    [HttpGet("{id}/assignments")]
    public async Task<IActionResult> GetSiteAssignments(int id)
    {
        var result = await _assignmentService.GetBySiteAsync(id);
        return Ok(new ApiResponse<List<SiteAssignmentResponse>>(result));
    }

    [HttpPatch("{id}/assignments/{assignmentId}")]
    public async Task<IActionResult> UpdateAssignment(int id, int assignmentId, [FromBody] UpdateAssignmentRequest request)
    {
        var result = await _assignmentService.UpdateAsync(id, assignmentId, request);
        return Ok(new ApiResponse<SiteAssignmentResponse>(result));
    }

    [HttpDelete("{id}/assignments/{assignmentId}")]
    public async Task<IActionResult> DeleteAssignment(int id, int assignmentId)
    {
        await _assignmentService.DeleteAsync(id, assignmentId);
        return NoContent();
    }

    [HttpPost("{id}/assignments/check-conflicts")]
    public async Task<IActionResult> CheckConflicts(int id, [FromBody] CheckConflictsRequest request)
    {
        var result = await _assignmentService.CheckConflictsAsync(id, request.UserId, request.StartDatetime, request.EndDatetime, request.ExcludeAssignmentId);
        return Ok(new ApiResponse<List<ConflictWarning>>(result));
    }

    [HttpPost("{id}/assignments/adjust")]
    public async Task<IActionResult> ConfirmAdjustments(int id, [FromBody] List<AssignmentAdjustment> adjustments)
    {
        var result = await _assignmentService.ApplyAdjustmentsAsync(id, adjustments);
        return Ok(new ApiResponse<List<SiteAssignmentResponse>>(result));
    }
}
