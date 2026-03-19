using System.Net;
using System.Net.Http.Headers;
using BackEnd.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BackEnd.Tests;

public class FilesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public FilesControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int TenantId, int UserId)> SetupAsync()
    {
        var (tenantId, userId) = await _factory.SeedTestDataAsync();
        var token = _factory.GenerateTestToken(userId, tenantId, UserRole.Admin);
        return (token, tenantId, userId);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private MultipartFormDataContent CreateFileContent(string fileName = "test.png", string contentType = "image/png", byte[]? content = null)
    {
        content ??= new byte[] { 0x89, 0x50, 0x4E, 0x47, 1, 2, 3, 4 };
        var fileContent = new ByteArrayContent(content);
        fileContent.Headers.ContentType = System.Net.Http.Headers.MediaTypeHeaderValue.Parse(contentType);
        var formData = new MultipartFormDataContent();
        formData.Add(fileContent, "file", fileName);
        return formData;
    }

    [Fact]
    public async Task Upload_ValidFile_Returns201()
    {
        var (token, _, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post, "/api/files?entityType=Customer&entityId=1", token);
        request.Content = CreateFileContent();

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("test.png", body);
        Assert.Contains("image/png", body);
    }

    [Fact]
    public async Task List_ReturnsFilesForEntity()
    {
        var (token, tenantId, userId) = await SetupAsync();

        // Upload a file first
        var uploadReq = CreateRequest(HttpMethod.Post, "/api/files?entityType=Customer&entityId=99", token);
        uploadReq.Content = CreateFileContent("list-test.png");
        await _client.SendAsync(uploadReq);

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/files?entityType=Customer&entityId=99", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("list-test.png", body);
    }

    [Fact]
    public async Task Download_ExistingFile_ReturnsFileStream()
    {
        var (token, _, _) = await SetupAsync();

        // Upload first
        var uploadReq = CreateRequest(HttpMethod.Post, "/api/files?entityType=Customer&entityId=50", token);
        var fileBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 10, 20, 30, 40 };
        uploadReq.Content = CreateFileContent("download-test.png", "image/png", fileBytes);
        var uploadResponse = await _client.SendAsync(uploadReq);
        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);

        // Get the attachment ID from the list
        var listResponse = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/files?entityType=Customer&entityId=50", token));
        var listBody = await listResponse.Content.ReadAsStringAsync();

        // Extract ID — simple approach: find the first id in the response
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BackEnd.API.Data.AppDbContext>();
        var attachment = await db.Attachments.IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Filename == "download-test.png");
        Assert.NotNull(attachment);

        var downloadResponse = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, $"/api/files/{attachment.Id}/download", token));

        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);
        Assert.Equal("image/png", downloadResponse.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Delete_ExistingFile_Returns204()
    {
        var (token, _, _) = await SetupAsync();

        // Upload first
        var uploadReq = CreateRequest(HttpMethod.Post, "/api/files?entityType=Customer&entityId=60", token);
        uploadReq.Content = CreateFileContent("delete-test.png");
        await _client.SendAsync(uploadReq);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BackEnd.API.Data.AppDbContext>();
        var attachment = await db.Attachments.IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Filename == "delete-test.png");
        Assert.NotNull(attachment);

        var deleteResponse = await _client.SendAsync(
            CreateRequest(HttpMethod.Delete, $"/api/files/{attachment.Id}", token));

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Upload_ForbiddenMimeType_Returns400()
    {
        var (token, _, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post, "/api/files?entityType=Customer&entityId=1", token);
        request.Content = CreateFileContent("virus.exe", "application/x-msdownload");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("FileTypeNotAllowed", body);
    }

    [Fact]
    public async Task Upload_FileTooLarge_Returns400()
    {
        var (token, _, _) = await SetupAsync();

        var largeContent = new byte[10_485_761];
        var request = CreateRequest(HttpMethod.Post, "/api/files?entityType=Customer&entityId=1", token);
        request.Content = CreateFileContent("big.png", "image/png", largeContent);

        var response = await _client.SendAsync(request);

        // FormOptions (10 Mo) rejette avant FileService — statut 400 garanti, message peut varier
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_MissingEntityType_Returns400()
    {
        var (token, _, _) = await SetupAsync();

        var request = CreateRequest(HttpMethod.Post, "/api/files?entityId=1", token);
        request.Content = CreateFileContent();

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Download_NonExistent_Returns404()
    {
        var (token, _, _) = await SetupAsync();

        var response = await _client.SendAsync(
            CreateRequest(HttpMethod.Get, "/api/files/99999/download", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Unauthenticated_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/files?entityType=Customer&entityId=1");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
