using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.API.Infrastructure;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Company;
using BackEnd.Shared.Models.SiteAssignments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/company")]
[Authorize]
[RoleAuthorize(UserRole.Admin)]
public class CompanyController : ControllerBase
{
    private readonly ICompanyService _companyService;
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public CompanyController(ICompanyService companyService, AppDbContext db, ITenantContext tenantContext)
    {
        _companyService = companyService;
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetCompanyInfo()
    {
        var result = await _companyService.GetCompanyInfoAsync();
        return Ok(new ApiResponse<CompanyInfoResponse> { Data = result });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateCompanyInfo([FromBody] UpdateCompanyInfoRequest request)
    {
        var result = await _companyService.UpdateCompanyInfoAsync(request);
        return Ok(new ApiResponse<CompanyInfoResponse> { Data = result });
    }

    [HttpGet("subscription")]
    public async Task<IActionResult> GetSubscriptionInfo()
    {
        var result = await _companyService.GetSubscriptionInfoAsync();
        return Ok(new ApiResponse<SubscriptionInfoResponse> { Data = result });
    }

    private static readonly List<AssignmentPresetDto> DefaultPresets =
    [
        new() { Label = "Matin", StartTime = "08:00", EndTime = "12:00", Order = 0 },
        new() { Label = "Après-midi", StartTime = "12:00", EndTime = "17:00", Order = 1 },
        new() { Label = "Journée complète", StartTime = "08:00", EndTime = "17:00", Order = 2 }
    ];

    [HttpGet("assignment-presets")]
    [RoleAuthorize(UserRole.Admin, UserRole.Chef, UserRole.Secretaire)]
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
    public async Task<IActionResult> UpdateAssignmentPresets([FromBody] List<AssignmentPresetDto> presets)
    {
        // Validate presets
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
