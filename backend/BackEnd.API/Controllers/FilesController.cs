using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Files;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IFileService _fileService;

    public FilesController(IFileService fileService)
    {
        _fileService = fileService;
    }

    [HttpPost]
    public async Task<IActionResult> Upload(
        [FromQuery] string entityType,
        [FromQuery] int entityId,
        [FromForm] IFormFile file)
    {
        if (string.IsNullOrWhiteSpace(entityType))
            throw new ApiErrorException(ApiError.FileEntityTypeRequired);
        if (entityId <= 0)
            throw new ApiErrorException(ApiError.FileEntityIdRequired);

        var result = await _fileService.UploadAsync(entityType, entityId, file);
        return CreatedAtAction(nameof(Download), new { id = result.Id }, new ApiResponse<AttachmentResponse>(result));
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string entityType, [FromQuery] int entityId)
    {
        if (string.IsNullOrWhiteSpace(entityType))
            throw new ApiErrorException(ApiError.FileEntityTypeRequired);
        if (entityId <= 0)
            throw new ApiErrorException(ApiError.FileEntityIdRequired);

        var result = await _fileService.ListAsync(entityType, entityId);
        return Ok(new ApiResponse<List<AttachmentResponse>>(result));
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var result = await _fileService.DownloadAsync(id);
        if (result == null)
            throw new ApiErrorException(ApiError.FileNotFound);

        return File(result.Value.Stream, result.Value.ContentType, result.Value.Filename);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _fileService.DeleteAsync(id);
        return NoContent();
    }
}
