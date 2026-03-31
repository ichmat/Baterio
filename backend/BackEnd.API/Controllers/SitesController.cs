using BackEnd.API.Infrastructure;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
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

    public SitesController(ISiteService siteService)
    {
        _siteService = siteService;
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
}
