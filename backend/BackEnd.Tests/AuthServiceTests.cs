using BackEnd.API.Data;
using BackEnd.API.Infrastructure;
using BackEnd.API.Services;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Models.Auth;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace BackEnd.Tests;

public class AuthServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test-secret-key-minimum-32-chars-long!",
                ["Jwt:Issuer"] = "baterio-api",
                ["Jwt:Audience"] = "baterio-frontend",
                ["Jwt:ExpirationInMinutes"] = "30"
            })
            .Build();

        var jwtService = new JwtService(config, NullLogger<JwtService>.Instance);
        _authService = new AuthService(_db, jwtService, config);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private async Task<(Tenant tenant, User user)> SeedUserAsync(bool isActive = true)
    {
        var tenant = new Tenant { Name = "Test", CreatedAt = DateTime.UtcNow };
        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync();

        var user = new User
        {
            TenantId = tenant.Id,
            Email = "test@baterio.fr",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"),
            FirstName = "Test",
            LastName = "User",
            Role = UserRole.Admin,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return (tenant, user);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokens()
    {
        await SeedUserAsync();

        var result = await _authService.LoginAsync(new LoginRequest
        {
            Email = "test@baterio.fr",
            Password = "Test123!"
        });

        Assert.NotEmpty(result.AccessToken);
        Assert.NotEmpty(result.RefreshToken);
        Assert.Equal("test@baterio.fr", result.User.Email);
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ThrowsInvalidCredentials()
    {
        await SeedUserAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _authService.LoginAsync(new LoginRequest
            {
                Email = "test@baterio.fr",
                Password = "WrongPassword"
            }));

        Assert.Equal(ApiError.InvalidCredentials, ex.Code);
    }

    [Fact]
    public async Task LoginAsync_InactiveUser_ThrowsUserInactive()
    {
        await SeedUserAsync(isActive: false);

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _authService.LoginAsync(new LoginRequest
            {
                Email = "test@baterio.fr",
                Password = "Test123!"
            }));

        Assert.Equal(ApiError.UserInactive, ex.Code);
    }

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_RotatesToken()
    {
        await SeedUserAsync();

        var loginResult = await _authService.LoginAsync(new LoginRequest
        {
            Email = "test@baterio.fr",
            Password = "Test123!"
        });

        var refreshResult = await _authService.RefreshTokenAsync(new RefreshTokenRequest
        {
            RefreshToken = loginResult.RefreshToken
        });

        Assert.NotEmpty(refreshResult.AccessToken);
        Assert.NotEqual(loginResult.RefreshToken, refreshResult.RefreshToken);

        // Old token should be revoked
        var oldToken = await _db.RefreshTokens.FirstAsync(r => r.Token == loginResult.RefreshToken);
        Assert.NotNull(oldToken.RevokedAt);
    }

    [Fact]
    public async Task RefreshTokenAsync_InvalidToken_Throws()
    {
        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _authService.RefreshTokenAsync(new RefreshTokenRequest
            {
                RefreshToken = "nonexistent"
            }));

        Assert.Equal(ApiError.InvalidRefreshToken, ex.Code);
    }

    [Fact]
    public async Task RefreshTokenAsync_ExpiredToken_Throws()
    {
        await SeedUserAsync();

        var loginResult = await _authService.LoginAsync(new LoginRequest
        {
            Email = "test@baterio.fr",
            Password = "Test123!"
        });

        // Manually expire the token
        var token = await _db.RefreshTokens.FirstAsync(r => r.Token == loginResult.RefreshToken);
        token.ExpiresAt = DateTime.UtcNow.AddDays(-1);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ApiErrorException>(() =>
            _authService.RefreshTokenAsync(new RefreshTokenRequest
            {
                RefreshToken = loginResult.RefreshToken
            }));

        Assert.Equal(ApiError.ExpiredRefreshToken, ex.Code);
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_RevokesAllUserTokens()
    {
        var (_, user) = await SeedUserAsync();

        // Create multiple tokens via login
        await _authService.LoginAsync(new LoginRequest { Email = "test@baterio.fr", Password = "Test123!" });
        await _authService.LoginAsync(new LoginRequest { Email = "test@baterio.fr", Password = "Test123!" });

        await _authService.RevokeRefreshTokenAsync(user.Id);

        var activeTokens = await _db.RefreshTokens
            .Where(r => r.UserId == user.Id && r.RevokedAt == null)
            .CountAsync();

        Assert.Equal(0, activeTokens);
    }

    [Fact]
    public void BcryptHash_IsVerifiable()
    {
        var password = "Test123!";
        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        Assert.True(BCrypt.Net.BCrypt.Verify(password, hash));
        Assert.False(BCrypt.Net.BCrypt.Verify("wrong", hash));
    }
}
