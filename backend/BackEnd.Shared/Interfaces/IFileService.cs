using BackEnd.Shared.Models.Files;
using Microsoft.AspNetCore.Http;

namespace BackEnd.Shared.Interfaces;

public interface IFileService
{
    Task<AttachmentResponse> UploadAsync(string entityType, int entityId, IFormFile file);
    Task<(Stream Stream, string ContentType, string Filename)?> DownloadAsync(int attachmentId);
    Task DeleteAsync(int attachmentId);
    Task<List<AttachmentResponse>> ListAsync(string entityType, int entityId);
}
