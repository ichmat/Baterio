using System.Net;
using System.Net.Http.Json;
using BackEnd.API.Data;
using Microsoft.Extensions.DependencyInjection;

namespace BackEnd.Tests;

public class ApiExceptionFilterTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ApiExceptionFilterTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();

        // Ensure database schema is created
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
    }

    [Fact]
    public async Task ApiErrorException_ReturnsFormattedJson()
    {
        // Login with wrong credentials triggers ApiErrorException
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "wrong@email.com",
            password = "wrong"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"type\":\"ApiError\"", body);
        Assert.Contains("\"code\":\"InvalidCredentials\"", body);
        Assert.Contains("\"status\":401", body);
        Assert.Contains("Email ou mot de passe incorrect", body);
    }
}
