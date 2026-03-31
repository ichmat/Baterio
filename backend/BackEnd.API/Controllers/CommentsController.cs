using BackEnd.API.Infrastructure;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Comments;
using BackEnd.Shared.Models.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/comments")]
[Authorize]
[RoleAuthorize(UserRole.Admin, UserRole.Chef, UserRole.Secretaire)]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentsController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpPost]
    public async Task<IActionResult> Add(
        [FromQuery] string entityType, [FromQuery] int entityId,
        [FromBody] CreateCommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(entityType))
            throw new ApiErrorException(ApiError.CommentEntityTypeRequired);
        if (entityId <= 0)
            throw new ApiErrorException(ApiError.CommentEntityIdRequired);

        var result = await _commentService.AddAsync(entityType, entityId, request);
        return CreatedAtAction(nameof(Get), new { entityType, entityId }, new ApiResponse<CommentResponse>(result));
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string entityType, [FromQuery] int entityId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (string.IsNullOrWhiteSpace(entityType))
            throw new ApiErrorException(ApiError.CommentEntityTypeRequired);
        if (entityId <= 0)
            throw new ApiErrorException(ApiError.CommentEntityIdRequired);

        var result = await _commentService.GetAsync(entityType, entityId, page, pageSize);
        return Ok(new ApiResponse<PaginatedResponse<CommentResponse>>(result));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _commentService.DeleteAsync(id);
        return NoContent();
    }
}
