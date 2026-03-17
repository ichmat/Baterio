using BackEnd.API.Infrastructure;
using Microsoft.Extensions.Configuration;

namespace BackEnd.Tests;

public class LocalFileStorageTests : IDisposable
{
    private readonly string _tempDir;
    private readonly LocalFileStorage _storage;

    public LocalFileStorageTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"baterio-test-{Guid.NewGuid()}");
        Directory.CreateDirectory(_tempDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["FileStorage:BasePath"] = _tempDir
            })
            .Build();

        _storage = new LocalFileStorage(config);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    [Fact]
    public async Task SaveAsync_CreatesDirectoryAndFileWithGuidName()
    {
        var content = new MemoryStream(new byte[] { 1, 2, 3, 4 });

        var path = await _storage.SaveAsync(1, "Customer", 42, "photo.png", content);

        Assert.NotNull(path);
        Assert.StartsWith("1/Customer/42/", path);
        Assert.EndsWith(".png", path);
        // Filename should be a GUID, not the original
        Assert.DoesNotContain("photo", path);

        var absolutePath = Path.Combine(_tempDir, path.Replace('/', Path.DirectorySeparatorChar));
        Assert.True(File.Exists(absolutePath));
    }

    [Fact]
    public async Task SaveAsync_ReturnsRelativePathWithForwardSlashes()
    {
        var content = new MemoryStream(new byte[] { 1 });

        var path = await _storage.SaveAsync(1, "Quote", 10, "doc.pdf", content);

        Assert.DoesNotContain("\\", path);
        Assert.Contains("/", path);
    }

    [Fact]
    public async Task GetAsync_ReturnsStreamForExistingFile()
    {
        var originalContent = new byte[] { 10, 20, 30, 40, 50 };
        var path = await _storage.SaveAsync(1, "Test", 1, "file.bin", new MemoryStream(originalContent));

        var stream = await _storage.GetAsync(path);

        Assert.NotNull(stream);
        using var ms = new MemoryStream();
        await stream!.CopyToAsync(ms);
        Assert.Equal(originalContent, ms.ToArray());
        stream.Dispose();
    }

    [Fact]
    public async Task GetAsync_ReturnsNullForNonExistentFile()
    {
        var stream = await _storage.GetAsync("1/Test/1/nonexistent.png");

        Assert.Null(stream);
    }

    [Fact]
    public async Task DeleteAsync_ReturnsTrueAndDeletesFile()
    {
        var path = await _storage.SaveAsync(1, "Test", 1, "delete-me.txt", new MemoryStream(new byte[] { 1 }));

        var result = await _storage.DeleteAsync(path);

        Assert.True(result);
        var absolutePath = Path.Combine(_tempDir, path.Replace('/', Path.DirectorySeparatorChar));
        Assert.False(File.Exists(absolutePath));
    }

    [Fact]
    public async Task DeleteAsync_ReturnsFalseForNonExistentFile()
    {
        var result = await _storage.DeleteAsync("1/Test/1/ghost.png");

        Assert.False(result);
    }
}
