using System.Text.Json;
using BackEnd.API.Data;
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
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/sites")]
[Authorize]
[RoleAuthorize(UserRole.Admin, UserRole.Chef, UserRole.Secretaire)]
public class SitesController : ControllerBase
{
    private readonly ISiteService _siteService;
    private readonly ISiteAssignmentService _assignmentService;
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public SitesController(ISiteService siteService, ISiteAssignmentService assignmentService, AppDbContext db, ITenantContext tenantContext)
    {
        _siteService = siteService;
        _assignmentService = assignmentService;
        _db = db;
        _tenantContext = tenantContext;
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

    // --- Assignment Presets ---

    private static readonly List<AssignmentPresetDto> DefaultPresets =
    [
        new() { Label = "Matin", StartTime = "08:00", EndTime = "12:00", Order = 0 },
        new() { Label = "Après-midi", StartTime = "12:00", EndTime = "17:00", Order = 1 },
        new() { Label = "Journée complète", StartTime = "08:00", EndTime = "17:00", Order = 2 }
    ];

    [HttpGet("assignment-presets")]
    public async Task<IActionResult> GetAssignmentPresets()
    {
        var companyInfo = await _db.CompanyInfos.FirstOrDefaultAsync();
        List<AssignmentPresetDto> presets;

        if (companyInfo?.AssignmentPresets != null)
        {
            presets = JsonSerializer.Deserialize<List<AssignmentPresetDto>>(companyInfo.AssignmentPresets,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? DefaultPresets;
        }
        else
        {
            presets = DefaultPresets;
        }

        return Ok(new ApiResponse<List<AssignmentPresetDto>>(presets));
    }

    [HttpPut("assignment-presets")]
    [RoleAuthorize(UserRole.Admin)]
    public async Task<IActionResult> UpdateAssignmentPresets([FromBody] List<AssignmentPresetDto> presets)
    {
        if (presets == null || presets.Count == 0)
            throw new ApiErrorException(ApiError.AssignmentPresetsListEmpty);

        foreach (var preset in presets)
        {
            if (string.IsNullOrWhiteSpace(preset.Label))
                throw new ApiErrorException(ApiError.AssignmentPresetLabelRequired);

            if (!TimeOnly.TryParse(preset.StartTime, out var startTime) ||
                !TimeOnly.TryParse(preset.EndTime, out var endTime) ||
                endTime <= startTime)
                throw new ApiErrorException(ApiError.AssignmentPresetInvalidTime);
        }

        var companyInfo = await _db.CompanyInfos.FirstOrDefaultAsync();
        if (companyInfo == null)
        {
            companyInfo = new BackEnd.Shared.Entities.CompanyInfo
            {
                TenantId = _tenantContext.TenantId,
                CreatedAt = DateTime.UtcNow
            };
            _db.CompanyInfos.Add(companyInfo);
        }

        companyInfo.AssignmentPresets = JsonSerializer.Serialize(presets);
        companyInfo.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new ApiResponse<List<AssignmentPresetDto>>(presets));
    }
}
