namespace BackEnd.Shared.Interfaces;

public interface IFileStorage
{
    Task<string> SaveAsync(int tenantId, string entityType, int entityId, string filename, Stream content);
    Task<Stream?> GetAsync(string path);
    Task<bool> DeleteAsync(string path);
}
