using System.Security.Claims;
using BackEnd.API.Data;
using BackEnd.API.Services;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace BackEnd.Tests;

public class FileServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly Mock<IFileStorage> _fileStorageMock;
    private readonly Mock<IAuditService> _auditServiceMock;
    private readonly FileService _fileService;
    private readonly int _tenantId;
    private readonly int _userId;

    public FileServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var tenantContext = new TestTenantContext();
        _db = new AppDbContext(options, tenantContext);
        _db.Database.EnsureCreated();

        var tenant = new Tenant { Name = "Test Tenant", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(tenant);
        _db.SaveChanges();
        _tenantId = tenant.Id;
        tenantContext.TenantId = _tenantId;

        var user = new User
        {
            TenantId = _tenantId, Email = "test@baterio.fr", PasswordHash = "hash",
            FirstName = "Test", LastName = "User", Role = UserRole.Admin,
            IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        _db.SaveChanges();
        _userId = user.Id;

        _fileStorageMock = new Mock<IFileStorage>();
        _auditServiceMock = new Mock<IAuditService>();
        var httpContextAccessor = CreateHttpContextAccessor(_userId);

        _fileService = new FileService(_db, tenantContext, _fileStorageMock.Object,
            _auditServiceMock.Object, httpContextAccessor, NullLogger<FileService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task UploadAsync_ValidFile_CreatesAttachmentAndCallsStorage()
    {
        _fileStorageMock.Setup(s => s.SaveAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<Stream>()))
            .ReturnsAsync("1/Customer/42/abc.png");

        var file = CreateFormFile("test.png", "image/png", new byte[] { 1, 2, 3 });

        var result = await _fileService.UploadAsync("Customer", 42, file);

        Assert.Equal("test.png", result.Filename);
        Assert.Equal("image/png", result.ContentType);
        Assert.Equal(3, result.Size);
        Assert.Equal("Customer", result.EntityType);
        Assert.Equal(42, result.EntityId);

        var attachment = await _db.Attachments.FirstOrDefaultAsync();
        Assert.NotNull(attachment);
        Assert.Equal("1/Customer/42/abc.png", attachment.Path);
    }

    [Fact]
    public async Task UploadAsync_InvalidMimeType_ThrowsFileTypeNotAllowed()
    {
        var file = CreateFormFile("virus.exe", "application/x-msdownload", new byte[] { 1 });

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _fileService.UploadAsync("Customer", 1, file));

        Assert.Equal(ApiError.FileTypeNotAllowed, ex.Code);
    }

    [Fact]
    public async Task UploadAsync_EmptyFile_ThrowsFileRequired()
    {
        var file = CreateFormFile("empty.png", "image/png", Array.Empty<byte>());

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _fileService.UploadAsync("Customer", 1, file));

        Assert.Equal(ApiError.FileRequired, ex.Code);
    }

    [Fact]
    public async Task UploadAsync_FileTooLarge_ThrowsFileTooLarge()
    {
        var largeContent = new byte[10_485_761]; // 10 Mo + 1 byte
        var file = CreateFormFile("big.png", "image/png", largeContent);

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _fileService.UploadAsync("Customer", 1, file));

        Assert.Equal(ApiError.FileTooLarge, ex.Code);
    }

    [Fact]
    public async Task UploadAsync_NullFile_ThrowsFileRequired()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _fileService.UploadAsync("Customer", 1, null!));

        Assert.Equal(ApiError.FileRequired, ex.Code);
    }

    [Fact]
    public async Task UploadAsync_CreatesAuditEventFileAttached()
    {
        _fileStorageMock.Setup(s => s.SaveAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<Stream>()))
            .ReturnsAsync("1/Customer/42/abc.png");

        var file = CreateFormFile("doc.pdf", "application/pdf", new byte[] { 1 });

        await _fileService.UploadAsync("Customer", 42, file);

        _auditServiceMock.Verify(a => a.LogEventAsync("Customer", 42, AuditAction.FileAttached, It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task DownloadAsync_ExistingFile_ReturnsStream()
    {
        // Seed attachment
        _db.Attachments.Add(new Attachment
        {
            TenantId = _tenantId, EntityType = "Customer", EntityId = 1,
            Filename = "photo.jpg", ContentType = "image/jpeg", Size = 100,
            Path = "1/Customer/1/abc.jpg", UploadedBy = _userId, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var fileStream = new MemoryStream(new byte[] { 1, 2, 3 });
        _fileStorageMock.Setup(s => s.GetAsync("1/Customer/1/abc.jpg")).ReturnsAsync(fileStream);

        var result = await _fileService.DownloadAsync(1);

        Assert.NotNull(result);
        Assert.Equal("image/jpeg", result!.Value.ContentType);
        Assert.Equal("photo.jpg", result.Value.Filename);
    }

    [Fact]
    public async Task DownloadAsync_NonExistent_ReturnsNull()
    {
        var result = await _fileService.DownloadAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_ExistingFile_RemovesFromDbAndStorage()
    {
        _db.Attachments.Add(new Attachment
        {
            TenantId = _tenantId, EntityType = "Customer", EntityId = 1,
            Filename = "delete-me.pdf", ContentType = "application/pdf", Size = 50,
            Path = "1/Customer/1/del.pdf", UploadedBy = _userId, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        _fileStorageMock.Setup(s => s.DeleteAsync("1/Customer/1/del.pdf")).ReturnsAsync(true);

        await _fileService.DeleteAsync(1);

        Assert.Empty(await _db.Attachments.ToListAsync());
        _fileStorageMock.Verify(s => s.DeleteAsync("1/Customer/1/del.pdf"), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_NonExistent_ThrowsFileNotFound()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _fileService.DeleteAsync(999));

        Assert.Equal(ApiError.FileNotFound, ex.Code);
    }

    [Fact]
    public async Task DeleteAsync_CreatesAuditEventFileRemoved()
    {
        _db.Attachments.Add(new Attachment
        {
            TenantId = _tenantId, EntityType = "Quote", EntityId = 5,
            Filename = "invoice.pdf", ContentType = "application/pdf", Size = 100,
            Path = "1/Quote/5/inv.pdf", UploadedBy = _userId, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        _fileStorageMock.Setup(s => s.DeleteAsync(It.IsAny<string>())).ReturnsAsync(true);

        await _fileService.DeleteAsync(1);

        _auditServiceMock.Verify(a => a.LogEventAsync("Quote", 5, AuditAction.FileRemoved, It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task ListAsync_ReturnsSortedByDateDescending()
    {
        _db.Attachments.Add(new Attachment
        {
            TenantId = _tenantId, EntityType = "Customer", EntityId = 1,
            Filename = "old.png", ContentType = "image/png", Size = 10,
            Path = "p1", UploadedBy = _userId, CreatedAt = DateTime.UtcNow.AddHours(-2)
        });
        _db.Attachments.Add(new Attachment
        {
            TenantId = _tenantId, EntityType = "Customer", EntityId = 1,
            Filename = "new.png", ContentType = "image/png", Size = 20,
            Path = "p2", UploadedBy = _userId, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _fileService.ListAsync("Customer", 1);

        Assert.Equal(2, result.Count);
        Assert.Equal("new.png", result[0].Filename);
        Assert.Equal("old.png", result[1].Filename);
    }

    [Fact]
    public async Task ListAsync_TenantIsolation_DoesNotReturnOtherTenantFiles()
    {
        _db.Attachments.Add(new Attachment
        {
            TenantId = _tenantId, EntityType = "Customer", EntityId = 1,
            Filename = "mine.png", ContentType = "image/png", Size = 10,
            Path = "p1", UploadedBy = _userId, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        // Insert directly to bypass query filter for other tenant
        var otherTenant = new Tenant { Name = "Other", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(otherTenant);
        await _db.SaveChangesAsync();
        var otherUser = new User
        {
            TenantId = otherTenant.Id, Email = "other@test.fr", PasswordHash = "h",
            FirstName = "O", LastName = "U", Role = UserRole.Admin, IsActive = true, CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(otherUser);
        await _db.SaveChangesAsync();

        _db.Database.ExecuteSqlRaw(
            "INSERT INTO attachments (entity_type, entity_id, tenant_id, filename, content_type, size, path, uploaded_by, created_at) VALUES ('Customer', 1, {0}, 'theirs.png', 'image/png', 10, 'p2', {1}, datetime('now'))",
            otherTenant.Id, otherUser.Id);

        var result = await _fileService.ListAsync("Customer", 1);

        Assert.Single(result);
        Assert.Equal("mine.png", result[0].Filename);
    }

    private static IFormFile CreateFormFile(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    private static IHttpContextAccessor CreateHttpContextAccessor(int userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        return new HttpContextAccessor { HttpContext = httpContext };
    }

    private class TestTenantContext : ITenantContext
    {
        public int TenantId { get; set; }
    }
}
