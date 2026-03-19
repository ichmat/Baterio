using BackEnd.Shared.Interfaces;

namespace BackEnd.API.Infrastructure;

public class LocalFileStorage : IFileStorage
{
    private readonly string _basePath;

    public LocalFileStorage(IConfiguration configuration)
    {
        var basePath = Path.GetFullPath(configuration.GetValue<string>("FileStorage:BasePath") ?? "/data/uploads");
        _basePath = basePath.EndsWith(Path.DirectorySeparatorChar) ? basePath : basePath + Path.DirectorySeparatorChar;
    }

    public async Task<string> SaveAsync(int tenantId, string entityType, int entityId, string filename, Stream content)
    {
        var extension = Path.GetExtension(filename);
        var storedFilename = $"{Guid.NewGuid()}{extension}";
        var relativePath = Path.Combine(tenantId.ToString(), entityType, entityId.ToString(), storedFilename);

        var absolutePath = GetAbsolutePath(relativePath);
        var directory = Path.GetDirectoryName(absolutePath)!;
        Directory.CreateDirectory(directory);

        await using var fileStream = new FileStream(absolutePath, FileMode.Create, FileAccess.Write);
        await content.CopyToAsync(fileStream);

        return relativePath.Replace('\\', '/');
    }

    public async Task<Stream?> GetAsync(string path)
    {
        var absolutePath = GetAbsolutePath(path);

        try
        {
            var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                bufferSize: 4096, useAsync: true);
            return stream;
        }
        catch (FileNotFoundException)
        {
            return null;
        }
        catch (DirectoryNotFoundException)
        {
            return null;
        }
    }

    public async Task<bool> DeleteAsync(string path)
    {
        var absolutePath = GetAbsolutePath(path);

        try
        {
            File.Delete(absolutePath);
            return true;
        }
        catch (FileNotFoundException)
        {
            return false;
        }
        catch (DirectoryNotFoundException)
        {
            return false;
        }
    }

    private string GetAbsolutePath(string relativePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_basePath, relativePath));
        if (!fullPath.StartsWith(_basePath, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid file path");
        return fullPath;
    }
}
