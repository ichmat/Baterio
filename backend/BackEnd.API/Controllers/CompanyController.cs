using BackEnd.API.Infrastructure;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Company;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/company")]
[Authorize]
[RoleAuthorize(UserRole.Admin)]
public class CompanyController : ControllerBase
{
    private readonly ICompanyService _companyService;

    public CompanyController(ICompanyService companyService)
    {
        _companyService = companyService;
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

}
