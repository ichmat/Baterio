using BackEnd.API.Infrastructure;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.CustomFields;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/custom-fields")]
[Authorize]
[RoleAuthorize(UserRole.Admin)]
public class CustomFieldsController : ControllerBase
{
    private readonly ICustomFieldService _customFieldService;

    public CustomFieldsController(ICustomFieldService customFieldService)
    {
        _customFieldService = customFieldService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? appliesToQuotes, [FromQuery] bool? appliesToSites)
    {
        var result = await _customFieldService.GetAllAsync(appliesToQuotes, appliesToSites);
        return Ok(new ApiResponse<List<CustomFieldResponse>> { Data = result });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _customFieldService.GetByIdAsync(id);
        return Ok(new ApiResponse<CustomFieldResponse> { Data = result });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomFieldRequest request)
    {
        var result = await _customFieldService.CreateAsync(request);
        return StatusCode(201, new ApiResponse<CustomFieldResponse> { Data = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCustomFieldRequest request)
    {
        var result = await _customFieldService.UpdateAsync(id, request);
        return Ok(new ApiResponse<CustomFieldResponse> { Data = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _customFieldService.DeleteAsync(id);
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder([FromBody] ReorderCustomFieldsRequest request)
    {
        var result = await _customFieldService.ReorderAsync(request);
        return Ok(new ApiResponse<List<CustomFieldResponse>> { Data = result });
    }
}
