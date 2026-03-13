using BackEnd.API.Data;
using BackEnd.API.Infrastructure;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BackEnd.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwtService;
    private readonly int _accessTokenExpirationMinutes;

    public AuthService(AppDbContext db, JwtService jwtService, IConfiguration configuration)
    {
        _db = db;
        _jwtService = jwtService;
        _accessTokenExpirationMinutes = configuration.GetValue<int>("Jwt:ExpirationInMinutes");
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new ApiErrorException(ApiError.InvalidCredentials);
        }

        if (!user.IsActive)
        {
            throw new ApiErrorException(ApiError.UserInactive);
        }

        return await GenerateTokensAndResponse(user);
    }

    public async Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        var storedToken = await _db.RefreshTokens
            .IgnoreQueryFilters()
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken);

        if (storedToken == null || storedToken.RevokedAt != null)
        {
            throw new ApiErrorException(ApiError.InvalidRefreshToken);
        }

        if (storedToken.ExpiresAt < DateTime.UtcNow)
        {
            throw new ApiErrorException(ApiError.ExpiredRefreshToken);
        }

        // Rotation: revoke old token
        storedToken.RevokedAt = DateTime.UtcNow;

        var user = storedToken.User;
        return await GenerateTokensAndResponse(user);
    }

    public async Task RevokeRefreshTokenAsync(int userId)
    {
        var tokens = await _db.RefreshTokens
            .IgnoreQueryFilters()
            .Where(r => r.UserId == userId && r.RevokedAt == null)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    private async Task<LoginResponse> GenerateTokensAndResponse(User user)
    {
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshTokenString = _jwtService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenString,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenString,
            ExpiresAt = DateTime.UtcNow.AddMinutes(_accessTokenExpirationMinutes),
            User = new UserInfo
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                TenantId = user.TenantId
            }
        };
    }
}
