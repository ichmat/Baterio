using System.Security.Claims;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Files;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class FileService : IFileService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IFileStorage _fileStorage;
    private readonly IAuditService _auditService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<FileService> _logger;

    private const long MaxFileSize = 10_485_760; // 10 Mo

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    public FileService(AppDbContext db, ITenantContext tenantContext, IFileStorage fileStorage,
        IAuditService auditService, IHttpContextAccessor httpContextAccessor, ILogger<FileService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _fileStorage = fileStorage;
        _auditService = auditService;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<AttachmentResponse> UploadAsync(string entityType, int entityId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new ApiErrorException(ApiError.FileRequired);

        if (!AllowedMimeTypes.Contains(file.ContentType))
            throw new ApiErrorException(ApiError.FileTypeNotAllowed);

        if (file.Length > MaxFileSize)
            throw new ApiErrorException(ApiError.FileTooLarge);

        if (entityType.Length > 100)
            throw new ApiErrorException(ApiError.FileEntityTypeTooLong);

        if (file.FileName.Length > 255)
            throw new ApiErrorException(ApiError.FileNameTooLong);

        var userIdClaim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : 0;

        await using var stream = file.OpenReadStream();
        var storedPath = await _fileStorage.SaveAsync(_tenantContext.TenantId, entityType, entityId, file.FileName, stream);

        try
        {
            var attachment = new Attachment
            {
                TenantId = _tenantContext.TenantId,
                EntityType = entityType,
                EntityId = entityId,
                Filename = file.FileName,
                ContentType = file.ContentType,
                Size = file.Length,
                Path = storedPath,
                UploadedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _db.Attachments.Add(attachment);
            await _db.SaveChangesAsync();

            await _auditService.LogEventAsync(entityType, entityId, AuditAction.FileAttached,
                new { attachmentId = attachment.Id, filename = file.FileName, contentType = file.ContentType, size = file.Length });

            _logger.LogDebug("File uploaded: {Filename} → {Path}", file.FileName, storedPath);

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var uploadedByName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : "";

            return new AttachmentResponse
            {
                Id = attachment.Id,
                EntityType = attachment.EntityType,
                EntityId = attachment.EntityId,
                Filename = attachment.Filename,
                ContentType = attachment.ContentType,
                Size = attachment.Size,
                UploadedBy = attachment.UploadedBy,
                UploadedByName = uploadedByName,
                CreatedAt = attachment.CreatedAt
            };
        }
        catch
        {
            // Cleanup orphan file on disk if DB/audit fails
            await _fileStorage.DeleteAsync(storedPath);
            throw;
        }
    }

    public async Task<(Stream Stream, string ContentType, string Filename)?> DownloadAsync(int attachmentId)
    {
        var attachment = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == attachmentId);
        if (attachment == null)
            return null;

        var stream = await _fileStorage.GetAsync(attachment.Path);
        if (stream == null)
            return null;

        return (stream, attachment.ContentType, attachment.Filename);
    }

    public async Task DeleteAsync(int attachmentId)
    {
        var attachment = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == attachmentId);
        if (attachment == null)
            throw new ApiErrorException(ApiError.FileNotFound);

        var entityType = attachment.EntityType;
        var entityId = attachment.EntityId;
        var filename = attachment.Filename;

        await _fileStorage.DeleteAsync(attachment.Path);

        _db.Attachments.Remove(attachment);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync(entityType, entityId, AuditAction.FileRemoved,
            new { attachmentId, filename });

        _logger.LogDebug("File deleted: {Filename} (attachment {AttachmentId})", filename, attachmentId);
    }

    public async Task<List<AttachmentResponse>> ListAsync(string entityType, int entityId)
    {
        return await _db.Attachments
            .Where(a => a.EntityType == entityType && a.EntityId == entityId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AttachmentResponse
            {
                Id = a.Id,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                Filename = a.Filename,
                ContentType = a.ContentType,
                Size = a.Size,
                UploadedBy = a.UploadedBy,
                UploadedByName = ((a.UploadedByUser.FirstName ?? "") + " " + (a.UploadedByUser.LastName ?? "")).Trim(),
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }
}
