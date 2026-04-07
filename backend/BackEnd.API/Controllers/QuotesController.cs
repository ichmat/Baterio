using BackEnd.API.Infrastructure;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Planning;
using BackEnd.Shared.Models.Quotes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/quotes")]
[Authorize]
[RoleAuthorize(UserRole.Admin, UserRole.Chef, UserRole.Secretaire)]
public class QuotesController : ControllerBase
{
    private readonly IQuoteService _quoteService;

    public QuotesController(IQuoteService quoteService)
    {
        _quoteService = quoteService;
    }

    [HttpGet("reminders")]
    public async Task<IActionResult> GetReminders([FromQuery] string start, [FromQuery] string end)
    {
        if (!DateOnly.TryParse(start, out var startDate) || !DateOnly.TryParse(end, out var endDate))
            return BadRequest(new { message = "Les paramètres start et end doivent être au format yyyy-MM-dd" });

        var result = await _quoteService.GetRemindersAsync(startDate, endDate);
        return Ok(new ApiResponse<List<QuoteReminderResponse>>(result));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _quoteService.GetAllAsync(page, pageSize);
        return Ok(new ApiResponse<PaginatedResponse<QuoteListResponse>>(result));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q = "", [FromQuery] int limit = 10)
    {
        if (q.Length > 200) q = q[..200];
        var result = await _quoteService.SearchAsync(q, limit);
        return Ok(new ApiResponse<List<QuoteSearchResult>>(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _quoteService.GetByIdAsync(id);
        if (result == null)
            throw new ApiErrorException(ApiError.QuoteNotFound);
        return Ok(new ApiResponse<QuoteResponse>(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateQuoteRequest request)
    {
        var result = await _quoteService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, new ApiResponse<QuoteResponse>(result));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateQuoteRequest request)
    {
        var result = await _quoteService.UpdateAsync(id, request);
        return Ok(new ApiResponse<QuoteResponse>(result));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateQuoteStatusRequest request)
    {
        var result = await _quoteService.UpdateStatusAsync(id, request);
        return Ok(new ApiResponse<QuoteResponse>(result));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _quoteService.DeleteAsync(id);
        return NoContent();
    }
}
